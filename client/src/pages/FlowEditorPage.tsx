import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFlowStore } from '../stores/flow.store';
import { useBotStore } from '../stores/bot.store';
import { FlowEditor } from '../components/flow-builder/FlowEditor';
import { TriggersEditor } from '../components/flow-builder/TriggersEditor';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Settings, X } from 'lucide-react';

export function FlowEditorPage() {
  const { botId, flowId } = useParams<{ botId: string; flowId: string }>();
  const navigate = useNavigate();
  const { currentFlow, loadFlow, saveFlow, updateTriggers, isLoading } = useFlowStore();
  const { currentBot, loadBot } = useBotStore();
  const [showSettings, setShowSettings] = useState(false);

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

  const triggers = currentFlow?.triggers ? JSON.parse(currentFlow.triggers) : [];

  const handleTriggersChange = async (newTriggers: string[]) => {
    if (botId && flowId) {
      await updateTriggers(botId, flowId, newTriggers);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/bots/${botId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-900">{currentFlow.name}</h1>
          <p className="text-xs text-gray-500">{currentBot?.name}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className={showSettings ? 'bg-gray-100' : ''}
        >
          <Settings className="w-4 h-4 mr-2" />
          Flow Settings
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Flow Editor */}
        <div className="flex-1">
          <FlowEditor botId={botId!} onSave={handleSave} />
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Flow Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <TriggersEditor
                triggers={triggers}
                onChange={handleTriggersChange}
                isDefault={currentFlow.isDefault}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
