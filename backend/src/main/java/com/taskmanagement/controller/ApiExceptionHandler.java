package com.taskmanagement.controller;

import java.util.Comparator;
import java.util.List;

import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.taskmanagement.service.InvalidSearchConditionException;
import com.taskmanagement.service.InvalidTaskException;
import com.taskmanagement.service.InvalidTaskStatusException;
import com.taskmanagement.service.TaskNotFoundException;

/**
 * エラーの応答を、RFC 9457（Problem Details）の形で返す。Content-Type は application/problem+json。
 * <pre>
 * { "title": "入力した値が正しくありません", "status": 400,
 *   "detail": "タイトルは必須です", "instance": "/api/tasks", "field": "title" }
 * </pre>
 * title はエラーの種類、detail は何が間違っているか、instance は呼んだパス、field は間違えた項目（あるときだけ）。
 * type は標準の値（about:blank）なので省略される（RFC 9457 では、省略は about:blank と同じ意味）。
 * ResponseEntityExceptionHandler を元にするので、Spring が出すほかのエラー（405 など）も同じ形になる。
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	/** 間違いが2つ以上あるときに、どれを返すかの順番（前にあるものを優先する） */
	private static final List<String> FIELD_ORDER = List.of("title", "description", "priority", "dueDate", "hidden");

	@ExceptionHandler(InvalidTaskException.class)
	public ProblemDetail invalidTask(InvalidTaskException exception) {
		return problem(HttpStatus.BAD_REQUEST, "入力した値が正しくありません", exception.getMessage(), exception.getField());
	}

	@ExceptionHandler(InvalidSearchConditionException.class)
	public ProblemDetail invalidSearchCondition(InvalidSearchConditionException exception) {
		return problem(HttpStatus.BAD_REQUEST, "検索条件が正しくありません", exception.getMessage(), exception.getField());
	}

	@ExceptionHandler(InvalidTaskStatusException.class)
	public ProblemDetail invalidStatus(InvalidTaskStatusException exception) {
		return problem(HttpStatus.BAD_REQUEST, "状態の値が正しくありません", exception.getMessage(), exception.getField());
	}

	@ExceptionHandler(TaskNotFoundException.class)
	public ProblemDetail notFound(TaskNotFoundException exception) {
		return problem(HttpStatus.NOT_FOUND, "タスクが見つかりません", exception.getMessage(), null);
	}

	/**
	 * 本体の値が、@Valid で調べた印（@NotBlank、@Size など）に合わないとき。
	 * detail には印に書いたエラー文（例：「タイトルは必須です」）を、field には間違えた項目を入れる。
	 * 間違いが2つ以上あるときは、FIELD_ORDER の順で1つ目だけを返す（Service で調べていたときと同じ順）。
	 */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		FieldError error = exception.getBindingResult().getFieldErrors().stream()
				.min(Comparator.comparingInt(ApiExceptionHandler::fieldOrder))
				.orElse(null);
		ProblemDetail body = error == null
				? problem(HttpStatus.BAD_REQUEST, "入力した値が正しくありません", "入力した値を確認してください", null)
				: problem(HttpStatus.BAD_REQUEST, "入力した値が正しくありません", error.getDefaultMessage(), error.getField());
		return handleExceptionInternal(exception, body, headers, status, request);
	}

	/** 本体が JSON として読めないとき（形が壊れている、型が違うなど） */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException exception,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "本体の形が正しくありません",
				"本体を JSON として読めませんでした。形と値の種類を確認してください", null);
		return handleExceptionInternal(exception, body, headers, status, request);
	}

	/** パスやパラメータの値の種類が違うとき（例：/api/tasks/abc の abc は数字でない） */
	@Override
	protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException exception, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		String name = exception instanceof MethodArgumentTypeMismatchException mismatch
				? mismatch.getName()
				: exception.getPropertyName();
		String detail = ("id".equals(name) ? "id は数字です" : name + " の値の種類が正しくありません")
				+ "（送られた値：" + exception.getValue() + "）";
		ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "パスやパラメータの値が正しくありません", detail, name);
		return handleExceptionInternal(exception, body, headers, status, request);
	}

	private static int fieldOrder(FieldError error) {
		int index = FIELD_ORDER.indexOf(error.getField());
		return index == -1 ? FIELD_ORDER.size() : index;
	}

	private static ProblemDetail problem(HttpStatus status, String title, String detail, String field) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setTitle(title);
		if (field != null) {
			problem.setProperty("field", field);
		}
		return problem;
	}
}
