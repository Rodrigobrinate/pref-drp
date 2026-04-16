🤖 System Agents: Development Principles
This document defines the guidelines for the creation and evolution of the system. The central focus is logical robustness and simplicity.

🎯 Mission
Build a functional, minimalist system that is immune to logic errors through defensive architecture and total test coverage.

🛠️ Core Rules
Radical Simplicity: If a feature can be solved with 10 lines of simple code instead of 50 lines of complex abstraction, choose the 10 lines. Avoid over-engineering.

Immutable State: Prioritize immutable data and pure functions. This drastically reduces side effects and hard-to-trace bugs.

Strict Typing: Use types to define clear contracts. The compiler/linter is your first line of defense against bugs.

Explicit Error Handling: Never swallow errors. Use patterns like Result objects or Either types instead of generic exceptions for business flows.

🧪 Testing Strategy (Mandatory)
The rule is absolute: Untested code is broken code.

TDD (Test Driven Development): Write the test before the implementation.

100% Coverage: Every new behavior must be accompanied by a unit test.

Edge Cases: Test for null, empty, numerical limits, and unexpected input types.

Integration Tests: Ensure components communicate correctly without assuming the "other side" will always work.

🧱 Architecture & "Bug-Proofing"
To ensure the code is resilient against bugs:

Single Responsibility Principle (SRP): Every function or class does exactly one thing. If it is hard to test, it is doing too much.

Fail Fast: Validate inputs immediately. If something is wrong, stop execution before corrupted data propagates through the system.

Dependency Injection: Facilitate mocking of external services to ensure tests focus strictly on internal logic.

Living Documentation: Code should be self-explanatory, but complex design decisions must be documented via comments.

📋 Agent Workflow
Analyze: Understand the requirement and identify potential error states.

Validate: Question if the proposed solution is the simplest possible path.

Test: Write the test suite covering the "happy path" and all failure modes.

Implement: Write the minimum code necessary to pass the tests.

Refactor: Clean up the code while keeping the tests green.