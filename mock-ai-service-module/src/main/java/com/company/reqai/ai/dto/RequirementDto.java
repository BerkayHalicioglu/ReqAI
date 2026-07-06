package com.company.reqai.ai.dto;

import java.util.List;

public class RequirementDto {
    private String title;
    private String description;
    private String priority;
    private String complexity;
    private List<TaskDto> tasks;

    public RequirementDto() {}

    public RequirementDto(String title, String description, String priority, String complexity, List<TaskDto> tasks) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.complexity = complexity;
        this.tasks = tasks;
    }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getPriority() { return priority; }
    public String getComplexity() { return complexity; }
    public List<TaskDto> getTasks() { return tasks; }

    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setPriority(String priority) { this.priority = priority; }
    public void setComplexity(String complexity) { this.complexity = complexity; }
    public void setTasks(List<TaskDto> tasks) { this.tasks = tasks; }
}
