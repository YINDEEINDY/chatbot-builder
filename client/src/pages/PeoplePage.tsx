import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useBotStore } from '../stores/bot.store';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { contactsApi } from '../api/contacts';
import { TagManagementModal } from '../components/people/TagManagementModal';
import { Contact, Message } from '../types';
import {
  ArrowLeft,
  Users,
  Search,
  MessageSquare,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Clock,
  Loader2,
  Check,
  Filter,
} from 'lucide-react';

export function PeoplePage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { currentBot, loadBot } = useBotStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [stats, setStats] = useState<{ total: number; subscribed: number; recentActive: number } | null>(null);

  // Tag management
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (botId) {
      loadBot(botId);
      loadContacts();
      loadStats();
    }
  }, [botId, loadBot, page, search, tagFilter]);

  const loadContacts = async () => {
    if (!botId) return;
    setIsLoading(true);
    try {
      const filter: { search?: string; tags?: string } = {};
      if (search) filter.search = search;
      if (tagFilter) filter.tags = tagFilter;

      const response = await contactsApi.list(botId, page, 20, Object.keys(filter).length > 0 ? filter : undefined);
      if (response.success && response.data) {
        setContacts(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }

        // Extract all unique tags from contacts
        const tags = new Set<string>();
        response.data.forEach((contact) => {
          try {
            const contactTags = JSON.parse(contact.tags) as string[];
            contactTags.forEach((tag) => tags.add(tag));
          } catch {
            // ignore
          }
        });
        setAllTags(Array.from(tags).sort());
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!botId) return;
    try {
      const response = await contactsApi.getStats(botId);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    setLoadingMessages(true);
    try {
      const response = await contactsApi.getMessages(botId!, contact.id);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadContacts();
  };

  const getTags = (contact: Contact): string[] => {
    try {
      return JSON.parse(contact.tags);
    } catch {
      return [];
    }
  };

  const toggleSelectContact = (contactId: string) => {
    setSelectedIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  const getSelectedTags = (): string[] => {
    const tags = new Set<string>();
    contacts
      .filter((c) => selectedIds.includes(c.id))
      .forEach((c) => getTags(c).forEach((t) => tags.add(t)));
    return Array.from(tags);
  };

  const handleTagModalSuccess = () => {
    loadContacts();
    setSelectedIds([]);
  };

  return (
    <MainLayout>
      <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/bots/${botId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">People</h1>
            <p className="text-gray-500">{currentBot?.name} - Users who have chatted with your bot</p>
          </div>
          {selectedIds.length > 0 && (
            <Button onClick={() => setShowTagModal(true)}>
              <Tag className="w-4 h-4 mr-2" />
              Manage Tags ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Contacts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-2xl font-bold text-green-600">{stats.subscribed}</p>
                <p className="text-sm text-gray-500">Subscribed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-2xl font-bold text-blue-600">{stats.recentActive}</p>
                <p className="text-sm text-gray-500">Active (7 days)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Contacts List */}
          <div className="w-96 flex flex-col">
            {/* Search and Filter */}
            <div className="mb-4 space-y-3">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or ID..."
                    className="pl-10"
                  />
                </div>
              </form>

              {/* Tag Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={tagFilter}
                    onChange={(e) => {
                      setTagFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Tags</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
                {tagFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTagFilter('');
                      setPage(1);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* List */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : contacts.length === 0 ? (
                <CardContent className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No contacts found</p>
                  </div>
                </CardContent>
              ) : (
                <>
                  {/* Select All */}
                  <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedIds.length === contacts.length && contacts.length > 0
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedIds.length === contacts.length && contacts.length > 0 && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      Select All ({contacts.length})
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`flex items-start p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectContact(contact.id);
                          }}
                          className="mr-3 mt-1"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedIds.includes(contact.id)
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {selectedIds.includes(contact.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </button>

                        {/* Contact Info */}
                        <button
                          onClick={() => handleSelectContact(contact)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              {contact.profilePic ? (
                                <img
                                  src={contact.profilePic}
                                  alt={contact.name || 'Contact'}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <UserIcon className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {contact.name || contact.senderId}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <MessageSquare className="w-3 h-3" />
                                <span>{contact.messageCount} messages</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(contact.lastSeenAt).toLocaleDateString()}
                            </div>
                          </div>
                          {getTags(contact).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {getTags(contact).slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                                >
                                  <Tag className="w-2.5 h-2.5 mr-1" />
                                  {tag}
                                </span>
                              ))}
                              {getTags(contact).length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{getTags(contact).length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="p-3 border-t border-gray-200 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          {/* Message History */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {selectedContact ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {selectedContact.profilePic ? (
                        <img
                          src={selectedContact.profilePic}
                          alt={selectedContact.name || 'Contact'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedContact.name || selectedContact.senderId}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        Last seen: {new Date(selectedContact.lastSeenAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedIds([selectedContact.id]);
                        setShowTagModal(true);
                      }}
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedContact(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Tags Display */}
                {getTags(selectedContact).length > 0 && (
                  <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap gap-1">
                      {getTags(selectedContact).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          <Tag className="w-2.5 h-2.5 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No messages yet
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.direction === 'incoming' ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            message.direction === 'incoming'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.direction === 'incoming' ? 'text-gray-500' : 'text-blue-200'
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center text-center">
                <div>
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a contact to view message history</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        botId={botId!}
        contactIds={selectedIds}
        existingTags={getSelectedTags()}
        onSuccess={handleTagModalSuccess}
      />
    </MainLayout>
  );
}
