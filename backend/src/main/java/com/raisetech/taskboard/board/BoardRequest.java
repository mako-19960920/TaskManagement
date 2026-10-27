package com.raisetech.taskboard.board;

import java.util.List;
import java.util.Map;

public record BoardRequest(Map<String, List<CardInput>> columns) {
}
