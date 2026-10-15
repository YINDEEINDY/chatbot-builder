import { useEffect, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { ArrowLeft, Check, MessageCircleQuestion, Redo2, Undo2 } from 'lucide-react';
import { useFlowStore } from '../stores/flow.store';
import { useBotStore } from '../stores/bot.store';
import { flowsApi } from '../api/flows';
import { FlowEditor } from '../components/flow-builder/FlowEditor';
import { errorText } from '../api/replies';
import { cn } from '../utils/cn';

export function FlowEditorPage() {
  const { botId = '', flowId = '' } = useParams();
  const { currentFlow, loadFlow, saveFlow, isLoading, isSaving, hasUnsavedChanges, canUndo, canRedo, undo, redo } = useFlowStore();
  const [preview, setPreview] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const loadBot = useBotStore((st) => st.loadBot);
  useEffect(() => { loadFlow(botId, flowId); loadBot(botId); }, [botId, flowId, loadFlow, loadBot]);
  useEffect(() => { if (currentFlow) setName(currentFlow.name); }, [currentFlow]);

  // Unsaved work: warn on tab close and on in-app navigation.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (hasUnsavedChanges) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);
  const blocker = useBlocker(hasUnsavedChanges);

  const save = async () => {
    setError('');
    try {
      await saveFlow(botId);
      if (currentFlow && name.trim() && name.trim() !== currentFlow.name) await flowsApi.update(botId, flowId, { name: name.trim() });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setError(errorText(e, 'บันทึกไม่สำเร็จ'));
    }
  };

  if (isLoading || !currentFlow || currentFlow.id !== flowId) {
    return <div className="flex h-dvh items-center justify-center bg-paper text-sm text-ink-soft">กำลังเปิดบอท</div>;
  }

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:px-4">
        <Link to={`/bots/${botId}/flows`} className="rounded-lg p-1.5 text-ink-soft hover:bg-gray-100" aria-label="กลับไปรายการบอท"><ArrowLeft className="h-5 w-5" /></Link>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); useFlowStore.setState({ hasUnsavedChanges: true }); }}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold outline-none hover:border-line focus:border-jade-500 md:max-w-sm"
          aria-label="ชื่อบอท"
          maxLength={100}
        />
        <div className="ml-auto flex items-center gap-1.5">
          {error && <span className="hidden text-xs text-red-700 md:inline" role="alert">{error}</span>}
          <button onClick={undo} disabled={!canUndo} className="hidden rounded-lg p-2 text-ink-soft hover:bg-gray-100 disabled:opacity-30 md:block" title="ย้อนกลับ (Ctrl+Z)" aria-label="ย้อนกลับ"><Undo2 className="h-4 w-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="hidden rounded-lg p-2 text-ink-soft hover:bg-gray-100 disabled:opacity-30 md:block" title="ทำซ้ำ" aria-label="ทำซ้ำ"><Redo2 className="h-4 w-4" /></button>
          <button onClick={() => setPreview((v) => !v)} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm', preview ? 'border-jade-600 bg-jade-50 text-jade-800' : 'border-line hover:bg-gray-50')}>
            <MessageCircleQuestion className="h-4 w-4" /><span className="hidden sm:inline">ทดลองคุย</span>
          </button>
          <button onClick={save} disabled={isSaving || (!hasUnsavedChanges && !justSaved)} className="flex min-w-[88px] items-center justify-center gap-1.5 rounded-lg bg-jade-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-jade-700 disabled:bg-gray-200 disabled:text-ink-soft">
            {justSaved ? <><Check className="h-4 w-4" />บันทึกแล้ว</> : isSaving ? 'กำลังบันทึก' : hasUnsavedChanges ? 'บันทึก' : 'บันทึกแล้ว'}
          </button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <FlowEditor botId={botId} flowId={flowId} onSave={save} previewOpen={preview} onClosePreview={() => setPreview(false)} />
      </div>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
          <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
            <h2 id="unsaved-title" className="font-semibold">ยังไม่ได้บันทึก</h2>
            <p className="mt-1 text-sm text-ink-soft">ถ้าออกตอนนี้ สิ่งที่แก้ไว้จะหายไป</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => blocker.reset()} className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">อยู่ต่อ</button>
              <button onClick={() => blocker.proceed()} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">ออกโดยไม่บันทึก</button>
              <button onClick={async () => { await save(); blocker.proceed(); }} className="rounded-lg bg-jade-600 px-3 py-1.5 text-sm font-medium text-white">บันทึกแล้วออก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
