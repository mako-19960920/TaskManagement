package com.raisetech.taskboard.board;

import java.util.List;
import java.util.Map;

public record BoardResponse(String name, Map<String, List<CardView>> columns) {
}
