import { useState } from 'react';
import { X, Plus, Zap, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface TriggersEditorProps {
  triggers: string[];
  onChange: (triggers: string[]) => void;
  isDefault?: boolean;
}

export function TriggersEditor({ triggers, onChange, isDefault }: TriggersEditorProps) {
  const [newTrigger, setNewTrigger] = useState('');

  const handleAdd = () => {
    const trimmed = newTrigger.trim().toLowerCase();
    if (trimmed && !triggers.includes(trimmed)) {
      onChange([...triggers, trimmed]);
      setNewTrigger('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(triggers.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        <label className="text-sm font-medium text-gray-700">Trigger Keywords</label>
      </div>

      {isDefault && (
        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>This is the default flow. It will run when no other flow matches, even without triggers.</p>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newTrigger}
          onChange={(e) => setNewTrigger(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a keyword (e.g., help, pricing)"
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleAdd}
          disabled={!newTrigger.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {triggers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {triggers.map((trigger, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
            >
              <Zap className="w-3 h-3" />
              {trigger}
              <button
                onClick={() => handleRemove(index)}
                className="p-0.5 hover:bg-yellow-200 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No triggers set. Add keywords that will activate this flow.
        </p>
      )}

      <p className="text-xs text-gray-500">
        When a user sends a message containing any of these keywords, this flow will be triggered.
      </p>
    </div>
  );
}
