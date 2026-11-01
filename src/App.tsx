import React, { useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { TopHeader } from './components/TopHeader';
import { BottomNav, NavTab } from './components/BottomNav';
import { FeedPage } from './pages/FeedPage';
import { SearchPage } from './pages/SearchPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { CloudConfigModal } from './components/CloudConfigModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { UnverifiedEmailBanner } from './components/UnverifiedEmailBanner';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Profile } from './types/database';

function MainLayout() {
  const { user, profile, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('feed');
  const [directPartner, setDirectPartner] = useState<Profile | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="INITIALIZING NEXORA..." />
      </div>
    );
  }

  // Protect all private routes
  if (!user) {
    return (
      <>
        <AuthPage onSuccess={() => setCurrentTab('feed')} />
        <ResetPasswordModal />
      </>
    );
  }

  const handleSelectUserToChat = (partner: Profile) => {
    setDirectPartner(partner);
    setCurrentTab('messages');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-neutral-800">
      {/* Unverified Email Warning Banner */}
      <UnverifiedEmailBanner />

      {/* Top Header on Feed & Search */}
      {(currentTab === 'feed' || currentTab === 'search') && (
        <TopHeader
          onDirectClick={() => {
            setDirectPartner(null);
            setCurrentTab('messages');
          }}
          onOpenConfig={() => setShowConfigModal(true)}
          unreadCount={0}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-lg mx-auto overflow-y-auto">
        {currentTab === 'feed' && (
          <FeedPage
            onSelectUserToChat={handleSelectUserToChat}
            onNavigateCreate={() => setCurrentTab('create')}
          />
        )}

        {currentTab === 'search' && (
          <SearchPage onSelectUser={handleSelectUserToChat} />
        )}

        {currentTab === 'create' && (
          <CreatePostPage onSuccess={() => setCurrentTab('feed')} />
        )}

        {currentTab === 'messages' && (
          <MessagesPage
            initialReceiver={directPartner}
            onClearInitialReceiver={() => setDirectPartner(null)}
            onNavigateToSearch={() => setCurrentTab('search')}
          />
        )}

        {currentTab === 'profile' && (
          <ProfilePage onOpenConfig={() => setShowConfigModal(true)} />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={(tab) => {
          if (tab !== 'messages') {
            setDirectPartner(null);
          }
          setCurrentTab(tab);
        }}
        avatarUrl={profile?.avatar_url}
        hasUnreadMessages={currentTab !== 'messages'}
      />

      {/* Password Recovery Modal from email link */}
      <ResetPasswordModal />

      {/* Cloud & Supabase Setup Modal */}
      <CloudConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
