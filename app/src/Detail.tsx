import { useEffect, useRef, useState } from 'react';
import { sb, KIND_LABEL, isAssessment, type Item, type Kind, type Step, type Subject, type Task } from './supabase';
import { DatePicker } from './DatePicker';
import { InlineAdd } from './tasks';
import { CheckIcon, CloseIcon } from './icons';

const KINDS: Kind[] = ['task', 'homework', 'sac', 'exam', 'assignment'];

export function Detail({ item, subjects, onClose, onUpdate, onSteps, onDelete }: {
  item: Item;
  subjects: Subject[];
  onClose: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onSteps: (ticks: { done: boolean }[]) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.description);
  const [score, setScore] = useState(item.result_score?.toString() ?? '');
  const [total, setTotal] = useState(item.result_total?.toString() ?? '');
  const [steps, setSteps] = useState<Step[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState('');
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sb.from('checklist_items').select('*').eq('card_id', item.id).order('position').then(({ data }) => setSteps((data ?? []) as Step[]));
  }, [item.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  function saveSteps(next: Step[]) {
    setSteps(next);
    onSteps(next.map(s => ({ done: s.done })));
  }
  async function addStep(text: string) {
    const { data, error } = await sb.from('checklist_items').insert({ card_id: item.id, text, position: Date.now() }).select().single();
    if (error) return setErr('that step did not save. try again.');
    saveSteps([...steps, data as Step]);
  }
  async function toggleStep(s: Step) {
    saveSteps(steps.map(x => (x.id === s.id ? { ...x, done: !x.done } : x)));
    const { error } = await sb.from('checklist_items').update({ done: !s.done }).eq('id', s.id);
    if (error) { setErr('that change did not save. try again.'); saveSteps(steps); }
  }
  async function removeStep(s: Step) {
    saveSteps(steps.filter(x => x.id !== s.id));
    await sb.from('checklist_items').delete().eq('id', s.id);
  }

  function commitTitle() {
    const t = title.trim();
    if (!t) return setTitle(item.title);
    if (t !== item.title) onUpdate({ title: t });
  }

  function commitResult() {
    const sc = score.trim() === '' ? null : Number(score);
    const tt = total.trim() === '' ? null : Number(total);
    if ((sc !== null && !Number.isFinite(sc)) || (tt !== null && !Number.isFinite(tt))) return setErr('marks need to be numbers, e.g. 38 out of 45.');
    setErr('');
    if (sc === item.result_score && tt === item.result_total) return;
    // a mark means the assessment is finished
    onUpdate({ result_score: sc, result_total: tt, done_at: sc !== null ? item.done_at ?? new Date().toISOString() : null });
  }

  const pct = score && total && Number(total) > 0 ? Math.round((Number(score) / Number(total)) * 100) : null;
  const doneSteps = steps.filter(s => s.done).length;

  return (
    <div className="sheet-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="task details" tabIndex={-1} ref={panel}>
        <div className="sheet-top">
          <span className="sheet-kind">{KIND_LABEL[item.kind]}</span>
          <button className="icon-btn" aria-label="close" onClick={onClose}><CloseIcon /></button>
        </div>

        <textarea
          className="sheet-title"
          value={title}
          rows={1}
          aria-label="title"
          onChange={e => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
        />

        <div className="field">
          <span className="field-label">type</span>
          <div className="chips">
            {KINDS.map(k => (
              <button key={k} className={'qchip' + (item.kind === k ? ' on' : '')} aria-pressed={item.kind === k} onClick={() => onUpdate({ kind: k })}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">subject</span>
          <div className="chips">
            <button className={'qchip' + (!item.subject_id ? ' on' : '')} aria-pressed={!item.subject_id} onClick={() => onUpdate({ subject_id: null })}>none</button>
            {subjects.map(s => (
              <button key={s.id} className={'qchip' + (item.subject_id === s.id ? ' on' : '')} aria-pressed={item.subject_id === s.id} onClick={() => onUpdate({ subject_id: s.id })}>
                <i className="dot" style={{ background: s.colour }} /> {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">{isAssessment(item) ? 'date' : 'due'}</span>
          <DatePicker value={item.due_at} hasTime={item.due_has_time} onChange={(due_at, due_has_time) => onUpdate({ due_at, due_has_time })} />
        </div>

        {isAssessment(item) && (
          <div className="field">
            <span className="field-label">result</span>
            <div className="result">
              <input inputMode="decimal" placeholder="mark" aria-label="mark" value={score} onChange={e => setScore(e.target.value)} onBlur={commitResult} />
              <span className="muted">out of</span>
              <input inputMode="decimal" placeholder="total" aria-label="out of" value={total} onChange={e => setTotal(e.target.value)} onBlur={commitResult} />
              {pct !== null && <b className="pct tabular">{pct}%</b>}
            </div>
          </div>
        )}

        <div className="field">
          <span className="field-label">
            {isAssessment(item) ? 'prep' : 'steps'}
            {steps.length > 0 && <span className="tabular"> {doneSteps} of {steps.length}</span>}
          </span>
          {steps.length > 0 && (
            <ul className="steps">
              {steps.map(s => (
                <li key={s.id} className={s.done ? 'done' : ''}>
                  <button className="check sm" role="checkbox" aria-checked={s.done} aria-label={s.text} onClick={() => toggleStep(s)}><CheckIcon size={11} /></button>
                  <span>{s.text}</span>
                  <button className="icon-btn sm" aria-label={`remove ${s.text}`} onClick={() => removeStep(s)}><CloseIcon size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <InlineAdd label={isAssessment(item) ? 'add a prep step' : 'add a step'} onAdd={v => addStep(v as string)} />
        </div>

        <div className="field">
          <span className="field-label">notes</span>
          <textarea
            className="notes"
            value={notes}
            placeholder="anything to remember"
            rows={3}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => { if (notes !== item.description) onUpdate({ description: notes }); }}
          />
        </div>

        {err && <p className="err" role="alert">{err}</p>}

        <div className="sheet-foot">
          <button className={'danger' + (confirmDelete ? ' armed' : '')} onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))} onBlur={() => setConfirmDelete(false)}>
            {confirmDelete ? 'tap again to delete' : 'delete'}
          </button>
          <button className="done-btn" onClick={onClose}>done</button>
        </div>
      </div>
    </div>
  );
}
