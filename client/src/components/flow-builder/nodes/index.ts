import { StartNode } from './StartNode';
import { TextNode } from './TextNode';
import { ImageNode } from './ImageNode';
import { QuickReplyNode } from './QuickReplyNode';
import { UserInputNode } from './UserInputNode';
import { ConditionNode } from './ConditionNode';
import { DelayNode } from './DelayNode';
import { EndNode } from './EndNode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, React.ComponentType<any>> = {
  start: StartNode,
  text: TextNode,
  image: ImageNode,
  quickReply: QuickReplyNode,
  userInput: UserInputNode,
  condition: ConditionNode,
  delay: DelayNode,
  end: EndNode,
};

export {
  StartNode,
  TextNode,
  ImageNode,
  QuickReplyNode,
  UserInputNode,
  ConditionNode,
  DelayNode,
  EndNode,
};
