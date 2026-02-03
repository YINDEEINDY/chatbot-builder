import { Router } from 'express';
import { pageContentController } from '../controllers/page-content.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/posts', pageContentController.getPosts.bind(pageContentController));
router.get('/posts/:postId/comments', pageContentController.getComments.bind(pageContentController));
router.delete('/comments/:commentId', pageContentController.deleteComment.bind(pageContentController));

export default router;
