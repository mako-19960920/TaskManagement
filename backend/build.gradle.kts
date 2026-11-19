import org.gradle.api.tasks.testing.logging.TestExceptionFormat
import org.gradle.api.tasks.testing.logging.TestLogEvent

plugins {
	java
	// Java の書き方のチェック（設定は config/checkstyle/checkstyle.xml）
	checkstyle
	id("org.springframework.boot") version "4.1.2"
	id("io.spring.dependency-management") version "1.1.7"
	// コードの整形。gradlew format で整形し、check のときに整形済みかを確かめる（決まりは config/eclipse-formatter.prefs）
	id("com.diffplug.spotless") version "8.11.0"
}

group = "com.taskmanagement"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	// テーブルの作成と変更を、番号付きの SQL（src/main/resources/db/migration）で管理する
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	runtimeOnly("org.postgresql:postgresql")
	runtimeOnly("org.flywaydb:flyway-database-postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	// 本物の PostgreSQL を使うテスト。テストのときだけ、Docker で使い捨ての PostgreSQL を立てる
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
}

spotless {
	java {
		target("src/**/*.java")
		eclipse().configFile("config/eclipse-formatter.prefs")
		trimTrailingWhitespace()
		endWithNewline()
	}
}

// 「gradlew format」で整形する（spotlessApply の短い名前）
tasks.register("format") {
	group = "formatting"
	description = "Java のコードを整形する（config/eclipse-formatter.prefs の決まりで）"
	dependsOn("spotlessApply")
}

checkstyle {
	toolVersion = "14.4.0"
	// 指摘が1つでもあれば、gradlew.bat check を失敗にする
	maxWarnings = 0
}

// コンパイラの警告をすべて出し、警告もエラーとして止める
tasks.withType<JavaCompile> {
	options.encoding = "UTF-8"
	options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror"))
}

tasks.withType<Test> {
	useJUnitPlatform()
	// 飛ばしたテストと失敗したテストは、名前をログに出す（失敗したときは理由も全部出す）
	testLogging {
		events(TestLogEvent.SKIPPED, TestLogEvent.FAILED)
		exceptionFormat = TestExceptionFormat.FULL
	}
	// 最後に、何件動いて、何件成功・失敗し、何件飛ばしたかを出す（CI のログで、本物の DB のテストが飛ばされていないかを見るため）
	addTestListener(object : TestListener {
		override fun beforeSuite(suite: TestDescriptor) {}
		override fun beforeTest(testDescriptor: TestDescriptor) {}
		override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}
		override fun afterSuite(suite: TestDescriptor, result: TestResult) {
			if (suite.parent == null) {
				println("テストの結果：${result.testCount} 件（成功 ${result.successfulTestCount}、失敗 ${result.failedTestCount}、飛ばした ${result.skippedTestCount}）")
			}
		}
	})
}
