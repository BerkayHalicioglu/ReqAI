package com.company.reqai.ai.dto;

public class AiAnalysisRequest {
    private String content;

    public AiAnalysisRequest() {}

    public AiAnalysisRequest(String content) {
        this.content = content;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
