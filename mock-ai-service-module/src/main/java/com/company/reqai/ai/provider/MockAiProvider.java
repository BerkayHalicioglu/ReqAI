package com.company.reqai.ai.provider;

import com.company.reqai.ai.dto.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MockAiProvider implements AiProvider {

    @Override
    public AiAnalysisResponse analyze(AiAnalysisRequest request) {
        String content = request.getContent();

        if (content == null || content.trim().isEmpty()) {
            return new AiAnalysisResponse(List.of());
        }

        String lowerContent = content.toLowerCase();
        List<RequirementDto> requirements = new ArrayList<>();

        if (containsAny(lowerContent, "login", "sign in", "giriş", "oturum")) {
            requirements.add(createLoginRequirement());
        }

        if (containsAny(lowerContent, "register", "sign up", "kayıt", "üye")) {
            requirements.add(createRegisterRequirement());
        }

        if (containsAny(lowerContent, "product", "ürün", "catalog", "catalogue")) {
            requirements.add(createProductRequirement());
        }

        if (containsAny(lowerContent, "cart", "basket", "sepet")) {
            requirements.add(createCartRequirement());
        }

        if (containsAny(lowerContent, "order", "sipariş")) {
            requirements.add(createOrderRequirement());
        }

        if (containsAny(lowerContent, "payment", "ödeme")) {
            requirements.add(createPaymentRequirement());
        }

        if (requirements.isEmpty()) {
            requirements.add(createGenericRequirement(content));
        }

        return new AiAnalysisResponse(requirements);
    }

    private boolean containsAny(String content, String... keywords) {
        for (String keyword : keywords) {
            if (content.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private RequirementDto createLoginRequirement() {
        return new RequirementDto(
                "User Login",
                "Users should be able to log in with email and password.",
                "HIGH",
                "MEDIUM",
                List.of(
                        new TaskDto(
                                "Develop Login API",
                                "Create a REST endpoint to authenticate users.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Successful login", "User should log in with valid credentials."),
                                        new TestScenarioDto("Invalid password", "System should display an authentication error.")
                                )
                        ),
                        new TaskDto(
                                "Develop Login UI",
                                "Create a login page with email and password fields.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Required fields", "System should validate empty email and password fields.")
                                )
                        )
                )
        );
    }

    private RequirementDto createRegisterRequirement() {
        return new RequirementDto(
                "User Registration",
                "Users should be able to create a new account.",
                "HIGH",
                "MEDIUM",
                List.of(
                        new TaskDto(
                                "Develop Registration API",
                                "Create an endpoint to register new users.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Successful registration", "New user account should be created."),
                                        new TestScenarioDto("Duplicate email", "System should prevent duplicate email registration.")
                                )
                        ),
                        new TaskDto(
                                "Develop Registration UI",
                                "Create a registration form.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Validation", "Required fields should be validated.")
                                )
                        )
                )
        );
    }

    private RequirementDto createProductRequirement() {
        return new RequirementDto(
                "Product Listing",
                "Users should be able to view available products.",
                "MEDIUM",
                "LOW",
                List.of(
                        new TaskDto(
                                "Develop Product Listing API",
                                "Create an endpoint to retrieve products.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Product list", "System should return product list successfully.")
                                )
                        ),
                        new TaskDto(
                                "Develop Product Listing UI",
                                "Create a page to display products.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Display products", "Products should be visible on the UI.")
                                )
                        )
                )
        );
    }

    private RequirementDto createCartRequirement() {
        return new RequirementDto(
                "Cart Management",
                "Users should be able to add and remove products from cart.",
                "HIGH",
                "MEDIUM",
                List.of(
                        new TaskDto(
                                "Develop Add to Cart API",
                                "Create an endpoint to add products to cart.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Add product to cart", "Selected product should be added to cart.")
                                )
                        ),
                        new TaskDto(
                                "Develop Remove from Cart API",
                                "Create an endpoint to remove products from cart.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Remove product from cart", "Selected product should be removed from cart.")
                                )
                        )
                )
        );
    }

    private RequirementDto createOrderRequirement() {
        return new RequirementDto(
                "Order Creation",
                "Users should be able to create an order using cart items.",
                "HIGH",
                "HIGH",
                List.of(
                        new TaskDto(
                                "Develop Create Order API",
                                "Create an endpoint to convert cart items into an order.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Create order", "Order should be created successfully."),
                                        new TestScenarioDto("Empty cart", "System should prevent order creation with an empty cart.")
                                )
                        ),
                        new TaskDto(
                                "Develop Order Confirmation UI",
                                "Create a confirmation page after order creation.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Order confirmation", "User should see confirmation after successful order.")
                                )
                        )
                )
        );
    }

    private RequirementDto createPaymentRequirement() {
        return new RequirementDto(
                "Payment Processing",
                "Users should be able to complete payment for orders.",
                "HIGH",
                "HIGH",
                List.of(
                        new TaskDto(
                                "Develop Payment API",
                                "Create an endpoint to process payments.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Successful payment", "Payment should be completed successfully."),
                                        new TestScenarioDto("Failed payment", "System should display payment failure message.")
                                )
                        )
                )
        );
    }

    private RequirementDto createGenericRequirement(String content) {
        String summary = content.length() > 120 ? content.substring(0, 120) + "..." : content;

        return new RequirementDto(
                "General Requirement Analysis",
                "No predefined keyword found. Manual review may be required. Summary: " + summary,
                "MEDIUM",
                "MEDIUM",
                List.of(
                        new TaskDto(
                                "Review Customer Requirement",
                                "Analyze uploaded text manually and identify development tasks.",
                                "NEW",
                                List.of(
                                        new TestScenarioDto("Requirement review", "Analyst should review and clarify the requirement.")
                                )
                        )
                )
        );
    }
}
