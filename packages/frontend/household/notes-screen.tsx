import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { MEMBERS, memberName, type HomeNote } from './model';
import { canReadNote } from './logic';
import { useHousehold } from './store';
import { ActionButton, Chip, EmptyState, Field, Panel, Person } from './ui';

export function NotesScreen() {
  const { state, dispatch, openEditor } = useHousehold();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All notes');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = state.notes.filter(note => canReadNote(note, state.actor) && (filter !== 'My notes' || note.author === state.actor) &&
    (filter !== 'Pinned' || note.pinned) && `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase())).sort((first, second) => Number(second.pinned) - Number(first.pinned));
  const selected = visible.find(note => note.id === selectedId);
  function handleEdit(note: HomeNote) {
    openEditor('note', { title: note.title, body: note.body, access: note.access, readers: note.readers.join(',') }, note.id);
  }
  function audience(note: HomeNote) {
    return note.access === 'home' ? 'Everyone at home' : note.access === 'private' ? 'Only the author' : [note.author, ...note.readers.filter(id => id !== note.author)].map(memberName).join(', ');
  }
  return <PageColumns weights={[1.1, 1]}>
    <View className="gap-4"><Field label="Find a home note" value={query} onChangeText={setQuery} placeholder="Search notes you can read…"/>
      <View className="flex-row flex-wrap gap-2">{['All notes', 'Pinned', 'My notes'].map(title => <Chip key={title} title={title} selected={filter === title} onPress={() => setFilter(title)}/>)}</View>
      {!visible.length && <EmptyState title="No notes to show" body="Try another search, or create a note for your household."/>}
      {visible.map(note => <Pressable key={note.id} accessibilityRole="button" accessibilityLabel={`Read ${note.title}`} onPress={() => setSelectedId(note.id)}
        className={`gap-3 rounded-[25px] p-5 active:opacity-70 ${selectedId === note.id ? 'bg-home-peach' : 'bg-home-surface'}`}>
        <View className="flex-row items-center gap-3"><Icon name={note.access === 'home' ? 'person' : 'lock'} size={19}/><Label className="min-w-0 flex-1 text-[12px] text-home-muted">{audience(note)}</Label>{note.pinned && <Label className="text-[11px] text-home-on-peach">Pinned</Label>}</View>
        <Label className="text-[18px] font-medium">{note.title}</Label><Label numberOfLines={2} className="text-[13px] leading-5 text-home-muted">{note.body}</Label>
        <Person id={note.author} caption/>
      </Pressable>)}
    </View>
    <View className="gap-5">{selected ? <Panel tone="peach"><View className="flex-row items-start gap-3"><Label accessibilityRole="header" className="min-w-0 flex-1 text-[23px]">{selected.title}</Label><Icon name="lock" size={20}/></View>
      <Label selectable className="text-[15px] leading-7">{selected.body}</Label><View className="h-px bg-home-peach-button"/>
      <Label className="text-[12px] text-home-on-peach">Readable by: {audience(selected)}</Label>
      <Label className="text-[12px] text-home-muted">Only {memberName(selected.author)} can edit this note.</Label>
      {selected.author === state.actor && <View className="gap-2"><ActionButton secondary onPress={() => handleEdit(selected)}>Edit note & permissions</ActionButton>
        <ActionButton secondary onPress={() => dispatch({ type: 'pin-note', id: selected.id })}>{selected.pinned ? 'Unpin note' : 'Pin note'}</ActionButton></View>}
    </Panel> : <Panel tone="peach"><Icon name="lock" size={30} color="#8e3205"/><Label className="text-[25px] leading-8 text-home-on-peach">Useful details. The right people.</Label>
      <Label className="text-[13px] leading-6 text-home-on-peach">Open a note to read it. The author can share it with everyone, selected members, or keep it private in this preview.</Label></Panel>}
      <Panel title="Try the permission states"><Label className="text-[13px] leading-6 text-home-muted">Switch the preview member above. Restricted notes and their contents are omitted for other members.</Label>
        <View className="flex-row gap-2">{MEMBERS.map(member => <Person key={member.id} id={member.id}/>)}</View>
        <Label className="text-[11px] leading-5 text-home-muted">This is client-side UI behaviour, not security. Do not enter actual passwords or codes. Real permissions need server enforcement.</Label></Panel>
    </View>
  </PageColumns>;
}
