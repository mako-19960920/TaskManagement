package com.taskmanagement.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class PriorityConverter implements AttributeConverter<Priority, String> {

	@Override
	public String convertToDatabaseColumn(Priority attribute) {
		return attribute == null ? null : attribute.value();
	}

	@Override
	public Priority convertToEntityAttribute(String dbData) {
		return dbData == null ? null : Priority.from(dbData);
	}
}
