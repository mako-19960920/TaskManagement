package com.taskmanagement.controller;

import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
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

	private static ProblemDetail problem(HttpStatus status, String title, String detail, String field) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setTitle(title);
		if (field != null) {
			problem.setProperty("field", field);
		}
		return problem;
	}
}
