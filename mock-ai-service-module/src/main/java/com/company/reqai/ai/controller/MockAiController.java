package com.company.reqai.ai.controller;

import com.company.reqai.ai.dto.AiAnalysisRequest;
import com.company.reqai.ai.dto.AiAnalysisResponse;
import com.company.reqai.ai.service.RequirementAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mock-ai")
@CrossOrigin(origins = "*")
public class MockAiController {

    private final RequirementAnalysisService requirementAnalysisService;

    public MockAiController(RequirementAnalysisService requirementAnalysisService) {
        this.requirementAnalysisService = requirementAnalysisService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<AiAnalysisResponse> analyze(@RequestBody AiAnalysisRequest request) {
        return ResponseEntity.ok(requirementAnalysisService.analyzeText(request.getContent()));
    }
}
