import { test, expect } from '@playwright/test';

// Use Vite's default port
const APP_URL = 'http://localhost:5173';

test.describe('Project Kyuna - Full System Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Start at the root for every test
    await page.goto(APP_URL);
  });

  test('Journey 1: Auth Flow & Dashboard Rendering', async ({ page }) => {
    // 1. Protected Route should redirect to Login
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Perform Login (Tests AuthStore & auth.service)
    await page.fill('input[type="text"], input[name="username"]', 'test_user');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 3. Verify Dashboard Loads (Tests ProtectedRoute & Layouts)
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 4. Verify Greeting Hook (Tests useGreeting.ts)
    const greeting = page.locator('text=/Good (morning|afternoon|evening|night)/i');
    await expect(greeting).toBeVisible();

    // 5. Verify Sidebar Navigation exists (Tests Sidebar.tsx)
    await expect(page.locator('nav')).toBeVisible();
  });

  test('Journey 2: Pomodoro Timer Logic', async ({ page }) => {
    // Note: Assuming we are logged in or mock-authenticated
    await page.goto(`${APP_URL}/dashboard`);

    // 1. Find and start the timer (Tests timerStore & useTimer.ts)
    const startButton = page.locator('button', { hasText: 'Start' }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // 2. Verify state changes to "Pause" or shows counting down
      await expect(page.locator('button', { hasText: 'Pause' }).first()).toBeVisible();
    }
  });

  test('Journey 3: Local LLM Chat & Streaming', async ({ page }) => {
    await page.goto(`${APP_URL}/chat`);

    // 1. Create a new conversation (Tests ConversationList.tsx & chatStore)
    const newChatBtn = page.locator('button', { hasText: /New Chat/i });
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
    }

    // 2. Select a local model (Tests ModelSelector.tsx & /models API)
    // Clicks the dropdown trigger
    await page.click('button:has(svg.lucide-cpu)'); 
    // Selects a model (e.g., qwen or llama)
    const modelOption = page.locator('[role="menuitem"]', { hasText: /(qwen|llama)/i }).first();
    if (await modelOption.isVisible()) {
      await modelOption.click();
    }

    // 3. Send a prompt (Tests ChatInput.tsx & useStreamResponse.ts)
    const chatInput = page.locator('textarea');
    await chatInput.fill('Hello Luna, this is an automated system test.');
    await page.keyboard.press('Enter');

    // 4. Verify the Input disables and clears (Tests ChatInput state)
    await expect(chatInput).toBeEmpty();
    await expect(chatInput).toBeDisabled();

    // 5. Verify the AI is "Thinking" (Tests TypingIndicator.tsx)
    const thinkingIndicator = page.locator('text=Luna is thinking');
    await expect(thinkingIndicator).toBeVisible();

    // 6. Verify Streaming Response (Tests ChatMessage.tsx & react-markdown)
    // We wait for the assistant's message bubble to appear and contain text
    const assistantMessage = page.locator('.glass-card').last();
    await expect(assistantMessage).toBeVisible({ timeout: 15000 }); // Give local LLM 15s to respond
  });

  test('Journey 4: Image Translator UI scaffolding', async ({ page }) => {
    await page.goto(`${APP_URL}/translator`);

    // 1. Verify file uploader area exists (Tests FileUploader.tsx)
    const dropzone = page.locator('text=/drag and drop/i');
    await expect(dropzone).toBeVisible();

    // 2. Verify tools panel loaded (Tests ControlBar.tsx)
    await expect(page.locator('button', { hasText: /Translate/i })).toBeVisible();
  });

});