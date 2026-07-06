package com.company.reqai.ai.dto;

public class TestScenarioDto {
    private String title;
    private String expectedResult;

    public TestScenarioDto() {}

    public TestScenarioDto(String title, String expectedResult) {
        this.title = title;
        this.expectedResult = expectedResult;
    }

    public String getTitle() { return title; }
    public String getExpectedResult() { return expectedResult; }

    public void setTitle(String title) { this.title = title; }
    public void setExpectedResult(String expectedResult) { this.expectedResult = expectedResult; }
}
