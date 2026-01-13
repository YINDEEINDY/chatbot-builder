import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useFlowStore } from '../stores/flow.store';
import { Flow } from '../types';
import {
  Workflow,
  Plus,
  Star,
  Trash2,
  Copy,
  Loader2,
  MoreVertical,
} from 'lucide-react';

export function FlowsPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { flows, loadFlows, createFlow, deleteFlow, duplicateFlow, isLoading } = useFlowStore();
  const [creatingFlow, setCreatingFlow] = useState(false);

  useEffect(() => {
    if (botId) {
      loadFlows(botId);
    }
  }, [botId, loadFlows]);

  const handleCreateFlow = async () => {
    if (!botId) return;
    setCreatingFlow(true);
    try {
      const flow = await createFlow(botId, `Flow ${flows.length + 1}`);
      if (flow) {
        navigate(`/bots/${botId}/flows/${flow.id}`);
      }
    } catch (error) {
      console.error('Failed to create flow:', error);
    } finally {
      setCreatingFlow(false);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!botId || !confirm('Are you sure you want to delete this flow?')) return;
    await deleteFlow(botId, flowId);
  };

  const handleDuplicateFlow = async (flowId: string) => {
    if (!botId) return;
    const newFlow = await duplicateFlow(botId, flowId);
    if (newFlow) {
      navigate(`/bots/${botId}/flows/${newFlow.id}`);
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Flows</h1>
            <p className="text-gray-500 mt-1">
              Create and manage your chatbot conversation flows
            </p>
          </div>
          <Button onClick={handleCreateFlow} disabled={creatingFlow}>
            {creatingFlow ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            New Flow
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : flows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No flows yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first flow to start building your chatbot
              </p>
              <Button onClick={handleCreateFlow} disabled={creatingFlow}>
                <Plus className="w-4 h-4 mr-2" />
                Create Flow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flows.map((flow) => (
              <Link key={flow.id} to={`/bots/${botId}/flows/${flow.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Workflow className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{flow.name}</h3>
                            {flow.isDefault && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className={`text-xs ${flow.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                            {flow.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDuplicateFlow(flow.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {!flow.isDefault && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteFlow(flow.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {flow.triggers && JSON.parse(flow.triggers).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {JSON.parse(flow.triggers).slice(0, 3).map((trigger: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {trigger}
                          </span>
                        ))}
                        {JSON.parse(flow.triggers).length > 3 && (
                          <span className="px-2 py-0.5 text-gray-400 text-xs">
                            +{JSON.parse(flow.triggers).length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
