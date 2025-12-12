import { Router } from 'express';
import { chatService } from './services/chat-service';

const router = Router();

/**
 * POST /api/core/chat/command
 * Process AI chat commands
 */
router.post('/chat/command', async (req, res) => {
  try {
    const { command, message, context, history } = req.body;
    
    const result = await chatService.processCommand({
      command,
      message,
      context,
      history,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Chat command error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat command',
    });
  }
});

/**
 * POST /api/core/chat/message (alias for frontend compatibility)
 * Process AI chat messages
 */
router.post('/chat/message', async (req, res) => {
  try {
    const { message, userId, context } = req.body;
    
    const result = await chatService.processCommand({
      message,
      context,
    });

    res.json({
      success: true,
      content: result.response, // Frontend expects 'content'
      role: 'model',
      ...result,
    });
  } catch (error: any) {
    console.error('Chat message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message',
    });
  }
});

/**
 * GET /api/core/chat/health
 * Check AI services health
 */
router.get('/chat/health', async (req, res) => {
  try {
    const health = await chatService.healthCheck();
    res.json({
      success: true,
      ...health,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
export { router as coreRouter };
