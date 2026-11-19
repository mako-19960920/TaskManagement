package com.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * 本物の PostgreSQL を使うテスト。
 * テストのときだけ、Docker で使い捨ての PostgreSQL 17 を立てる（Testcontainers）。開発用のデータベース（5433）には触らない。
 * API を起動すると、Flyway が V1・V2 と初期データ（afterMigrate.sql）を流し、Hibernate が Task クラスとテーブルが合っているかを確かめる。
 * API は MockMvc で呼ぶ（ポートは開かない）。
 * テストごとに、データベースへの変更を取り消す（@Transactional）ので、どのテストも初期データ6件から始まる。
 * Docker が無い PC では、このテストは飛ばす（CI の GitHub Actions には Docker があるので、そこでは必ず動く）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class TaskDatabaseIntegrationTest {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private EntityManager entityManager;

	@Test
	void flywayCreatesTheTableAndHibernateAcceptsIt() {
		// API が起動できた時点で、Hibernate の確かめ（ddl-auto: validate）は通っている
		List<String> versions = jdbc.queryForList(
				"SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank", String.class);
		assertThat(versions).containsExactly("1", "2");

		List<String> constraints = jdbc.queryForList(
				"SELECT conname FROM pg_constraint WHERE conrelid = 'tasks'::regclass ORDER BY conname", String.class);
		assertThat(constraints).containsExactly("tasks_pkey", "tasks_values_check");

		List<String> indexes = jdbc.queryForList(
				"SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' ORDER BY indexname", String.class);
		assertThat(indexes).containsExactly("idx_tasks_status", "idx_tasks_status_position", "tasks_pkey");
	}

	@Test
	void initialDataIsInsertedInBoardOrder() throws Exception {
		mockMvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(6))
				.andExpect(jsonPath("$[*].title").value(contains(
						"買い物リストを作る", "メールを返す", "企画書の下書き", "資料を読み直す", "会議室を予約する", "日程を共有する")))
				.andExpect(jsonPath("$[1].dueDate").value("2026-10-26"))
				.andExpect(jsonPath("$[3].priority").value("low"));
	}

	@Test
	void createAddsToTheEndOfTodoAndSavesAllValues() throws Exception {
		String json = """
				{ "title": "  請求書を送る  ", "description": "月末まで", "priority": "high", "dueDate": "2026-11-30" }
				""";
		send(post("/api/tasks"), json)
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", matchesPattern("http://localhost/api/tasks/\\d+")))
				.andExpect(jsonPath("$.title").value("請求書を送る"))
				.andExpect(jsonPath("$.position").value(2));

		flush();
		var row = jdbc.queryForMap("SELECT * FROM tasks WHERE title = '請求書を送る'");
		assertThat(row).containsEntry("description", "月末まで")
				.containsEntry("priority", "high")
				.containsEntry("status", "todo")
				.containsEntry("position", 2)
				.containsEntry("hidden", false);
		assertThat(row.get("due_date")).hasToString("2026-11-30");
		assertThat(row.get("created_at")).isNotNull();
	}

	@Test
	void moveRenumbersBothColumns() throws Exception {
		long id = idOf("買い物リストを作る");
		long before = idOf("資料を読み直す");

		send(put("/api/tasks/" + id + "/position"), "{ \"status\": \"in_progress\", \"beforeId\": " + before + " }")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("in_progress"));

		assertThat(column("todo")).containsExactly("メールを返す");
		assertThat(column("in_progress")).containsExactly("企画書の下書き", "買い物リストを作る", "資料を読み直す");
		assertThat(positions("todo")).containsExactly(0);
		assertThat(positions("in_progress")).containsExactly(0, 1, 2);
	}

	@Test
	void deleteRemovesTheRowAndClosesTheGap() throws Exception {
		mockMvc.perform(delete("/api/tasks/" + idOf("買い物リストを作る")))
				.andExpect(status().isNoContent());

		assertThat(column("todo")).containsExactly("メールを返す");
		assertThat(positions("todo")).containsExactly(0);
		// もう無い id は 404
		mockMvc.perform(delete("/api/tasks/999999"))
				.andExpect(status().isNotFound());
	}

	@Test
	void hiddenDueDateAndEditAreSaved() throws Exception {
		long id = idOf("メールを返す");

		send(put("/api/tasks/" + id + "/hidden"), "{ \"hidden\": true }").andExpect(status().isOk());
		send(put("/api/tasks/" + id + "/due-date"), "{ \"dueDate\": null }").andExpect(status().isOk());
		send(put("/api/tasks/" + id), "{ \"title\": \"メールを返す（至急）\", \"priority\": \"high\" }")
				.andExpect(status().isOk());

		flush();
		var row = jdbc.queryForMap("SELECT * FROM tasks WHERE id = ?", id);
		assertThat(row).containsEntry("title", "メールを返す（至急）")
				.containsEntry("priority", "high")
				.containsEntry("hidden", true)
				// 非表示にしても、列の中の位置は変わらない
				.containsEntry("position", 1);
		assertThat(row.get("due_date")).isNull();
	}

	@Test
	void searchRunsOnPostgresql() throws Exception {
		send(post("/api/tasks"), "{ \"title\": \"達成率 100%\" }").andExpect(status().isCreated());
		send(post("/api/tasks"), "{ \"title\": \"テスト 100 点\" }").andExpect(status().isCreated());
		send(post("/api/tasks"), "{ \"title\": \"Weekly MEMO\" }").andExpect(status().isCreated());

		// % は「何でも」ではなく、文字として探す
		mockMvc.perform(get("/api/tasks/search").param("keyword", "100%"))
				.andExpect(jsonPath("$[*].title").value(contains("達成率 100%")));
		// 大文字と小文字を区別しない
		mockMvc.perform(get("/api/tasks/search").param("keyword", "memo"))
				.andExpect(jsonPath("$[*].title").value(contains("Weekly MEMO")));
		// 期限の範囲（両端を含む）と優先度の組み合わせ
		mockMvc.perform(get("/api/tasks/search").param("dueFrom", "2026-10-26").param("dueTo", "2026-10-26"))
				.andExpect(jsonPath("$[*].title").value(contains("メールを返す")));
		mockMvc.perform(get("/api/tasks/search").param("priority", "high").param("status", "done"))
				.andExpect(jsonPath("$[*].title").value(contains("日程を共有する")));
	}

	// API を通さずに SQL で入れても、テーブルの CHECK 制約が止める。
	// PostgreSQL は、1つのトランザクションの中で1回エラーが起きると、そのあとの命令をすべて断る（25P02）ので、
	// 1つの SQL ごとに別のテスト（別のトランザクション）にする
	@ParameterizedTest
	@ValueSource(strings = {
			"INSERT INTO tasks (title, priority) VALUES ('メモ', 'urgent')",
			"INSERT INTO tasks (title, status) VALUES ('メモ', 'later')",
			"INSERT INTO tasks (title) VALUES ('')"
	})
	void databaseRejectsValuesOutsideTheRules(String sql) {
		assertThatThrownBy(() -> jdbc.update(sql)).isInstanceOf(DataIntegrityViolationException.class);
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String json) throws Exception {
		return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private long idOf(String title) {
		flush();
		Long id = jdbc.queryForObject("SELECT id FROM tasks WHERE title = ?", Long.class, title);
		assertThat(id).isNotNull();
		return id;
	}

	/** その列のタイトルを、position の順で返す */
	private List<String> column(String status) {
		flush();
		return jdbc.queryForList("SELECT title FROM tasks WHERE status = ? ORDER BY position", String.class, status);
	}

	private List<Integer> positions(String status) {
		flush();
		return jdbc.queryForList("SELECT position FROM tasks WHERE status = ? ORDER BY position", Integer.class,
				status);
	}

	/** API（Hibernate）がまだ書き込んでいない変更を、データベースに書き込む（SQL で直接読む前に呼ぶ） */
	private void flush() {
		entityManager.flush();
	}
}
