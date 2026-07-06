package com.company.reqai.ai.provider;

import com.company.reqai.ai.dto.AiAnalysisRequest;
import com.company.reqai.ai.dto.AiAnalysisResponse;

public interface AiProvider {
    AiAnalysisResponse analyze(AiAnalysisRequest request);
}
