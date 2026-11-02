package com.taskmanagement.repository;

import java.time.LocalDate;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.taskmanagement.entity.Priority;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;

/** 検索条件を1つずつ組み立てる。値が null の条件は絞り込みに使わない。 */
public final class TaskSpecifications {

	/** LIKE で % や _ を文字として探すための印。 */
	private static final char ESCAPE = '!';

	private TaskSpecifications() {
	}

	/** タイトルか説明に keyword を含む（大文字と小文字を区別しない）。 */
	public static Specification<Task> keyword(String keyword) {
		return (root, query, cb) -> {
			if (keyword == null) {
				return null;
			}
			String pattern = "%" + escape(keyword.toLowerCase(Locale.ROOT)) + "%";
			return cb.or(
					cb.like(cb.lower(root.get("title")), pattern, ESCAPE),
					cb.like(cb.lower(root.get("description")), pattern, ESCAPE));
		};
	}

	public static Specification<Task> status(TaskStatus status) {
		return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
	}

	public static Specification<Task> priority(Priority priority) {
		return (root, query, cb) -> priority == null ? null : cb.equal(root.get("priority"), priority);
	}

	public static Specification<Task> dueFrom(LocalDate from) {
		return (root, query, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("dueDate"), from);
	}

	public static Specification<Task> dueTo(LocalDate to) {
		return (root, query, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("dueDate"), to);
	}

	/** % と _ を、ワイルドカードではなく文字として探すようにする。 */
	private static String escape(String value) {
		return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
	}
}
