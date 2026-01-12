import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { contactService } from '../services/contact.service.js';

export class ContactController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter = {
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        isSubscribed: req.query.isSubscribed === 'true' ? true : req.query.isSubscribed === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await contactService.listContacts(botId, userId, page, limit, filter);

      res.json({
        success: true,
        data: result.contacts,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const contactId = req.params.contactId as string;
      const userId = req.userId!;

      const contact = await contactService.getContact(contactId, botId, userId);

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const contactId = req.params.contactId as string;
      const userId = req.userId!;

      const contact = await contactService.updateContact(contactId, botId, userId, req.body);

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  async addTags(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;
      const { contactIds, tags } = req.body;

      const result = await contactService.addTags(botId, userId, contactIds, tags);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeTags(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;
      const { contactIds, tags } = req.body;

      const result = await contactService.removeTags(botId, userId, contactIds, tags);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const contactId = req.params.contactId as string;
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await contactService.getContactMessages(contactId, botId, userId, page, limit);

      res.json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;

      const stats = await contactService.getStats(botId, userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const contactController = new ContactController();
