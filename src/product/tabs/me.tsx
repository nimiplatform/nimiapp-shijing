// Me tab: self_subject NatalInputs editor + Persons list + Relations list +
// Workspace Settings editor + Conversations surface.

import { useState } from 'react';

import { describeTab } from '../navigation/tab-descriptor.ts';
import { NatalInputsForm } from '../inputs/natal-inputs-form.tsx';
import { PersonList } from '../persons/person-list.tsx';
import { RelationList } from '../relations/relation-list.tsx';
import { SettingsForm } from '../settings/settings-form.tsx';
import { ConversationList } from '../conversations/conversation-list.tsx';
import { ConversationThreadOverlay } from '../conversations/conversation-thread.tsx';

const TAB = describeTab('me');

export function MeTab() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  function onOpenThread(id: string) {
    setSelectedConversationId(id);
    setOverlayOpen(true);
  }

  return (
    <section className="shijing-tab shijing-tab--me" aria-labelledby="shijing-me-heading">
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">个人空间</p>
          <h2 id="shijing-me-heading">{TAB.chinese_label}</h2>
        </div>
      </header>

      <NatalInputsForm />
      <PersonList />
      <RelationList />
      <SettingsForm />

      <ConversationList
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        onOpenThread={onOpenThread}
      />

      <ConversationThreadOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        conversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
    </section>
  );
}
