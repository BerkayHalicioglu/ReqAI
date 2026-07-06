package com.company.reqai.ai.dto;

import java.util.List;

public class TaskDto {
    private String title;
    private String description;
    private String status;
    private List<TestScenarioDto> testScenarios;

    public TaskDto() {}

    public TaskDto(String title, String description, String status, List<TestScenarioDto> testScenarios) {
        this.title = title;
        this.description = description;
        this.status = status;
        this.testScenarios = testScenarios;
    }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public List<TestScenarioDto> getTestScenarios() { return testScenarios; }

    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setStatus(String status) { this.status = status; }
    public void setTestScenarios(List<TestScenarioDto> testScenarios) { this.testScenarios = testScenarios; }
}
