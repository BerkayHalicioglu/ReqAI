# Mock AI Service Module

This module simulates an AI-powered requirement analysis service for the ReqAI internship project.

It requires no API key, no paid AI service, and no internet access.

Endpoint:
POST /api/mock-ai/analyze

Example request:
{
  "content": "Customer wants users to login, view products, add products to cart and create orders."
}

The service returns structured Requirements, Tasks and Test Scenarios.
