plugins {
	java
	// Java の書き方のチェック（設定は config/checkstyle/checkstyle.xml）
	checkstyle
	id("org.springframework.boot") version "4.1.2"
	id("io.spring.dependency-management") version "1.1.7"
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
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
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
}
