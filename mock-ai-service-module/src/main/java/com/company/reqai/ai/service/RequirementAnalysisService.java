package com.company.reqai.ai.service;

import com.company.reqai.ai.dto.AiAnalysisRequest;
import com.company.reqai.ai.dto.AiAnalysisResponse;
import com.company.reqai.ai.provider.AiProvider;
import org.springframework.stereotype.Service;

@Service
public class RequirementAnalysisService {

    private final AiProvider aiProvider;

    public RequirementAnalysisService(AiProvider aiProvider) {
        this.aiProvider = aiProvider;
    }

    public AiAnalysisResponse analyzeText(String content) {
        return aiProvider.analyze(new AiAnalysisRequest(content));
    }
}
