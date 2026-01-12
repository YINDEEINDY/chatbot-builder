import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useBotStore } from '../stores/bot.store';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { contactsApi } from '../api/contacts';
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

  useEffect(() => {
    if (botId) {
      loadBot(botId);
      loadContacts();
      loadStats();
    }
  }, [botId, loadBot, page, search]);

  const loadContacts = async () => {
    if (!botId) return;
    setIsLoading(true);
    try {
      const response = await contactsApi.list(botId, page, 20, search ? { search } : undefined);
      if (response.success && response.data) {
        setContacts(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
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
            {/* Search */}
            <form onSubmit={handleSearch} className="mb-4">
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
                  <div className="flex-1 overflow-y-auto">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                          selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                        }`}
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
                          </div>
                        )}
                      </button>
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
                  <Button variant="ghost" size="sm" onClick={() => setSelectedContact(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

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
    </MainLayout>
  );
}
