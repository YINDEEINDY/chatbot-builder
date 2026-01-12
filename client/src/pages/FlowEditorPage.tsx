import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFlowStore } from '../stores/flow.store';
import { useBotStore } from '../stores/bot.store';
import { FlowEditor } from '../components/flow-builder/FlowEditor';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export function FlowEditorPage() {
  const { botId, flowId } = useParams<{ botId: string; flowId: string }>();
  const navigate = useNavigate();
  const { currentFlow, loadFlow, saveFlow, isLoading } = useFlowStore();
  const { currentBot, loadBot } = useBotStore();

  useEffect(() => {
    if (botId && flowId) {
      loadFlow(botId, flowId);
      loadBot(botId);
    }
  }, [botId, flowId, loadFlow, loadBot]);

  const handleSave = async () => {
    if (botId) {
      await saveFlow(botId);
    }
  };

  if (isLoading || !currentFlow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading flow...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/bots/${botId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="h-6 w-px bg-gray-200" />
        <div>
          <h1 className="text-sm font-semibold text-gray-900">{currentFlow.name}</h1>
          <p className="text-xs text-gray-500">{currentBot?.name}</p>
        </div>
      </div>

      {/* Flow Editor */}
      <div className="flex-1">
        <FlowEditor botId={botId!} onSave={handleSave} />
      </div>
    </div>
  );
}
