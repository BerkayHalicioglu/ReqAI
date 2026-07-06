package com.company.reqai.ai.dto;

import java.util.List;

public class AiAnalysisResponse {
    private List<RequirementDto> requirements;

    public AiAnalysisResponse() {}

    public AiAnalysisResponse(List<RequirementDto> requirements) {
        this.requirements = requirements;
    }

    public List<RequirementDto> getRequirements() {
        return requirements;
    }

    public void setRequirements(List<RequirementDto> requirements) {
        this.requirements = requirements;
    }
}
