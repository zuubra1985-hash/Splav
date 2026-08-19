import React, { useState, useRef, useEffect } from 'react';
import { CompanionTrip, Region, VesselType, AppUser, TripApplication, TripChatMessage, TripChatPresence, RiverRoute } from '../types';
import { TripChatSyncService } from '../firebase';
import { 
  Users, 
  Plus, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  MessageSquare, 
  Phone, 
  Send, 
  CheckCircle2, 
  Award, 
  Filter, 
  Sparkles, 
  ChevronRight, 
  X, 
  Check, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  Radio, 
  ExternalLink,
  Info,
  Layers,
  Compass,
  Edit3,
  Save,
  UploadCloud,
  Download,
  Archive,
  FolderArchive,
  RotateCcw,
  Trash2,
  Map as MapIcon,
  Navigation,
  Mountain,
  Mail,
  Smile,
  Circle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TripRouteMiniMap } from './TripRouteMiniMap';
import { parseGpxFile, generateGpxString } from '../utils/gpxParser';

interface CompanionsModuleProps {
  trips: CompanionTrip[];
  selectedRegion: Region;
  currentUser: AppUser | null;
  routes?: RiverRoute[];
  onOpenAuth: () => void;
  onCreateTrip: (newTrip: CompanionTrip) => void;
  onUpdateTrip: (updatedTrip: CompanionTrip) => void;
  onDeleteTrip?: (tripId: string) => void;
  onViewOnMainMap?: (trip: CompanionTrip) => void;
}

/**
 * Checks if an expedition is finished/expired based on the start date at 12:00 noon or status.
 * Trips automatically go to archive at 12:00 on their start date.
 */
export const isTripExpiredOrArchived = (trip: CompanionTrip): boolean => {
  if (trip.isArchived) return true;
  if (trip.status === 'completed') return true;
  if (!trip.startDate) return false;

  let startTimestamp: number | null = null;
  if (trip.startDate.includes('.')) {
    const parts = trip.startDate.split('.');
    if (parts.length === 3) {
      startTimestamp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).getTime();
    }
  } else if (trip.startDate.includes('-')) {
    startTimestamp = new Date(`${trip.startDate}T12:00:00`).getTime();
  }

  if (startTimestamp && !isNaN(startTimestamp)) {
    return Date.now() >= startTimestamp;
  }
  return false;
};

export const CompanionsModule: React.FC<CompanionsModuleProps> = ({
  trips,
  selectedRegion,
  currentUser,
  routes = [],
  onOpenAuth,
  onCreateTrip,
  onUpdateTrip,
  onDeleteTrip,
  onViewOnMainMap
}) => {
  const [selectedTrip, setSelectedTrip] = useState<CompanionTrip | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'map' | 'chat' | 'applications'>('details');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [joinModalTrip, setJoinModalTrip] = useState<CompanionTrip | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<boolean>(false);
  const [newChatMessage, setNewChatMessage] = useState<string>('');

  // Real-time instant chat and presence state
  const [liveChatMessages, setLiveChatMessages] = useState<TripChatMessage[]>([]);
  const [chatPresenceList, setChatPresenceList] = useState<TripChatPresence[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Main view tab: Active trips vs Admin Archive
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');

  // Filter state
  const [vesselFilter, setVesselFilter] = useState<VesselType | 'all'>('all');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [myTripsFilter, setMyTripsFilter] = useState<boolean>(false);

  // New Trip Form State
  const [newTitle, setNewTitle] = useState('');
  const [newRiver, setNewRiver] = useState('Собь');
  const [newRegion, setNewRegion] = useState<'ХМАО' | 'ЯНАО'>('ЯНАО');
  const [newStartDate, setNewStartDate] = useState('2026-08-30');
  const [newEndDate, setNewEndDate] = useState('2026-09-03');
  const [newTotalSeats, setNewTotalSeats] = useState(6);
  const [newCost, setNewCost] = useState(8000);
  const [newCategory, setNewCategory] = useState('II к.с.');
  const [newDesc, setNewDesc] = useState('');
  const [newTelegramLink, setNewTelegramLink] = useState('');
  const [newGearProvided, setNewGearProvided] = useState('Костровое снаряжение\nГрупповая аптечка\nТент лагерный');
  const [newRequiredGear, setNewRequiredGear] = useState('Спасжилет с сертификатом\nПалатка\nСпальник по сезону');
  const [newExperience, setNewExperience] = useState('Средний (2-4 сплава)');
  
  // Attached GPX for new trip
  const [newGpxTrack, setNewGpxTrack] = useState<CompanionTrip['gpxTrack'] | undefined>(undefined);
  const [newGpxFileName, setNewGpxFileName] = useState<string>('');
  const createGpxFileInputRef = useRef<HTMLInputElement>(null);

  // Direct Trip Edit State in CompanionsModule
  const [editingTripInModal, setEditingTripInModal] = useState<CompanionTrip | null>(null);
  const editGpxFileInputRef = useRef<HTMLInputElement>(null);

  // Join application form state
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantVessel, setApplicantVessel] = useState<VesselType>('sup');
  const [applicantExp, setApplicantExp] = useState('');
  const [applicantNotes, setApplicantNotes] = useState('');

  const isAdmin = currentUser?.email.toLowerCase() === 'zuubra1985@gmail.com' || currentUser?.email.toLowerCase() === 'novichek2@narod.ru' || currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  // Check if current user is the actual creator/organizer of a trip
  const isActualOrganizer = (trip: CompanionTrip) => {
    if (!currentUser) return false;
    if (trip.organizer.userId && trip.organizer.userId === currentUser.id) return true;
    if (currentUser.name && trip.organizer.name.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  };

  // Check if current user has organizer or admin permissions for a trip
  const isTripOrganizer = (trip: CompanionTrip) => {
    if (!currentUser) return false;
    if (isActualOrganizer(trip)) return true;
    if (isAdmin) return true;
    return false;
  };

  // Get user's application for a specific trip
  const getUserApplication = (trip: CompanionTrip): TripApplication | undefined => {
    if (!trip.applications || trip.applications.length === 0) return undefined;
    if (currentUser) {
      const byId = trip.applications.find(a => a.userId && a.userId === currentUser.id);
      if (byId) return byId;
      const byNameOrPhone = trip.applications.find(a => 
        (currentUser.name && a.applicantName.toLowerCase() === currentUser.name.toLowerCase()) ||
        (currentUser.phone && a.applicantPhone === currentUser.phone)
      );
      if (byNameOrPhone) return byNameOrPhone;
    }
    return undefined;
  };

  // Check if user is accepted participant
  const isUserParticipant = (trip: CompanionTrip) => {
    if (!currentUser) return false;
    return trip.participants.some(p => 
      (p.userId && p.userId === currentUser.id) ||
      p.name.toLowerCase().includes(currentUser.name.toLowerCase())
    );
  };

  // Auto-archive trips into two sets
  const activeTrips = trips.filter(t => !isTripExpiredOrArchived(t));
  const archivedTrips = trips.filter(t => isTripExpiredOrArchived(t));

  // Determine current list to display (regular users always see active)
  const currentList = (!isAdmin || viewTab === 'active') ? activeTrips : archivedTrips;

  const filteredTrips = currentList.filter((t) => {
    if (selectedRegion !== 'ALL' && t.region !== selectedRegion) return false;
    if (vesselFilter !== 'all' && !t.vessels.includes(vesselFilter)) return false;
    if (experienceFilter !== 'all' && t.requiredExperience !== experienceFilter) return false;
    if (myTripsFilter && currentUser) {
      const isOrg = isTripOrganizer(t);
      const isPart = isUserParticipant(t);
      const hasApp = !!getUserApplication(t);
      if (!isOrg && !isPart && !hasApp) return false;
    }
    return true;
  });

  const handleOpenJoinModal = (trip: CompanionTrip) => {
    setJoinModalTrip(trip);
    setApplicantName(currentUser?.name || '');
    setApplicantPhone(currentUser?.phone || '');
    setApplicantExp(currentUser?.experienceLevel || 'Любитель (1-2 к.с.)');
    setApplicantNotes('');
    setJoinSuccess(false);
  };

  // Handle GPX upload for creation modal
  const handleCreateGpxUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;
        const parsed = parseGpxFile(text, file.name);
        setNewGpxTrack({
          name: parsed.name,
          lengthKm: parsed.totalDistanceKm,
          coordinates: parsed.coordinates,
          startPoint: parsed.startPoint,
          endPoint: parsed.endPoint,
          elevationGainM: parsed.elevationGainM,
          waypoints: parsed.waypoints
        });
        setNewGpxFileName(file.name);
        if (!newTitle) setNewTitle(`Сплав: ${parsed.name}`);
        if (newRiver === 'Собь') setNewRiver(parsed.name.replace(/^(река|р\.)\s*/i, ''));
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch (err: any) {
        alert(err.message || 'Ошибка парсинга GPX файла');
      }
    };
    reader.readAsText(file);
  };

  // Handle GPX upload for editing modal
  const handleEditGpxUpload = (file: File) => {
    if (!editingTripInModal) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;
        const parsed = parseGpxFile(text, file.name);
        setEditingTripInModal({
          ...editingTripInModal,
          gpxTrack: {
            name: parsed.name,
            lengthKm: parsed.totalDistanceKm,
            coordinates: parsed.coordinates,
            startPoint: parsed.startPoint,
            endPoint: parsed.endPoint,
            elevationGainM: parsed.elevationGainM,
            waypoints: parsed.waypoints
          },
          gpxFileName: file.name
        });
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      } catch (err: any) {
        alert(err.message || 'Ошибка парсинга GPX');
      }
    };
    reader.readAsText(file);
  };

  // Quick link from catalog route in creation modal
  const handleSelectCatalogRoute = (routeId: string) => {
    const found = routes.find(r => r.id === routeId);
    if (!found) return;
    setNewRiver(found.riverName || found.name);
    setNewRegion(found.region);
    setNewCategory(found.fstrCategory);
    setNewGpxTrack({
      name: found.name,
      lengthKm: found.lengthKm,
      coordinates: found.coordinates,
      startPoint: found.startPoint,
      endPoint: found.endPoint,
      elevationGainM: found.elevationGainM,
      waypoints: found.pois
    });
    setNewGpxFileName(found.gpxFileName || `${found.id}.gpx`);
    if (!newTitle) setNewTitle(`Сплав по реке ${found.riverName || found.name}`);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsCreateModalOpen(false);
      onOpenAuth();
      return;
    }
    const gearList = newGearProvided
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const personalGearList = newRequiredGear
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const created: CompanionTrip = {
      id: `trip-custom-${Date.now()}`,
      title: newTitle || `Сплав по реке ${newRiver}`,
      riverName: newRiver,
      region: newRegion,
      startDate: newStartDate,
      endDate: newEndDate,
      durationDays: 4,
      vessels: ['kayak', 'sup'],
      fstrCategory: newCategory,
      totalSeats: newTotalSeats,
      bookedSeats: 1,
      organizer: {
        userId: currentUser?.id,
        name: currentUser?.name || 'Вы (Капитан)',
        avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        experienceYears: 4,
        completedTrips: 8,
        fstrRank: currentUser?.experienceLevel || 'Организатор походов',
        phone: currentUser?.phone || '+7 (999) 000-00-00',
        telegram: newTelegramLink ? `@${newTelegramLink.replace('@', '').replace('https://t.me/', '')}` : '@splav_crew'
      },
      description: newDesc || 'Совместный поход по красивейшей северной реке. Ищем надежных попутчиков!',
      requiredExperience: newExperience || 'Средний (2-4 сплава)',
      gearProvided: gearList.length > 0 ? gearList : ['Костровое снаряжение', 'Групповая аптечка', 'Тент лагерный'],
      requiredPersonalGear: personalGearList.length > 0 ? personalGearList : ['Спасжилет с сертификатом', 'Палатка', 'Спальник по сезону'],
      estimatedCostPerPersonRub: newCost,
      status: 'recruiting',
      participants: [
        { 
          userId: currentUser?.id,
          name: currentUser?.name || 'Вы (Капитан)', 
          role: 'Капитан / Организатор', 
          vessel: 'kayak', 
          avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          phone: currentUser?.phone
        }
      ],
      applications: [],
      chatMessages: [
        {
          id: `msg-${Date.now()}`,
          tripId: `trip-custom-${Date.now()}`,
          authorName: currentUser?.name || 'Капитан экспедиции',
          authorAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          role: 'organizer',
          text: `Экспедиция создана! Приветствуем будущих участников похода по реке ${newRiver}. Задавайте вопросы в чате.`,
          timestamp: 'Только что'
        }
      ],
      groupChatLink: newTelegramLink || undefined,
      commentsCount: 1,
      gpxTrack: newGpxTrack,
      gpxFileName: newGpxFileName || undefined
    };

    onCreateTrip(created);
    setIsCreateModalOpen(false);
    // Reset
    setNewGpxTrack(undefined);
    setNewGpxFileName('');
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
  };

  const handleSaveEditedTripInModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTripInModal) return;
    onUpdateTrip(editingTripInModal);
    if (selectedTrip?.id === editingTripInModal.id) {
      setSelectedTrip(editingTripInModal);
    }
    setEditingTripInModal(null);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  // Restore archived trip (Make active again)
  const handleRestoreArchivedTrip = (trip: CompanionTrip) => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const nextWeekStr = today.toISOString().split('T')[0];

    const updated: CompanionTrip = {
      ...trip,
      isArchived: false,
      status: 'recruiting',
      startDate: nextWeekStr,
      archivedAt: undefined
    };

    onUpdateTrip(updated);
    if (selectedTrip?.id === trip.id) {
      setSelectedTrip(updated);
    }
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
  };

  // Delete trip from archive or database
  const handleDeleteArchivedTrip = (tripId: string) => {
    if (window.confirm('Вы действительно хотите удалить этот поход из архива?')) {
      if (onDeleteTrip) {
        onDeleteTrip(tripId);
      }
      setSelectedTrip(null);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinModalTrip) return;

    const newApp: TripApplication = {
      id: `app-${Date.now()}`,
      tripId: joinModalTrip.id,
      userId: currentUser?.id,
      applicantName: applicantName.trim() || (currentUser?.name || 'Путешественник'),
      applicantPhone: applicantPhone.trim() || (currentUser?.phone || ''),
      applicantEmail: currentUser?.email,
      applicantAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      experienceLevel: applicantExp || 'Любитель (1-2 к.с.)',
      vesselType: applicantVessel,
      hasOwnGear: true,
      notes: applicantNotes.trim(),
      status: 'pending',
      appliedAt: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    };

    // Update trip with new application
    const existingApps = joinModalTrip.applications || [];
    const updatedTrip: CompanionTrip = {
      ...joinModalTrip,
      applications: [newApp, ...existingApps.filter(a => a.userId !== currentUser?.id)]
    };

    onUpdateTrip(updatedTrip);
    if (selectedTrip?.id === updatedTrip.id) {
      setSelectedTrip(updatedTrip);
    }

    setJoinSuccess(true);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => {
      setJoinModalTrip(null);
      setJoinSuccess(false);
    }, 1800);
  };

  const handleAcceptApplication = (trip: CompanionTrip, app: TripApplication) => {
    const updatedApps = (trip.applications || []).map(a => 
      a.id === app.id ? { ...a, status: 'accepted' as const } : a
    );
    const newParticipant = {
      userId: app.userId,
      name: app.applicantName,
      role: 'Участник экипажа',
      vessel: app.vesselType || 'kayak',
      avatar: app.applicantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      phone: app.applicantPhone
    };
    const updatedTrip: CompanionTrip = {
      ...trip,
      bookedSeats: Math.min(trip.totalSeats, trip.bookedSeats + 1),
      participants: [...trip.participants, newParticipant],
      applications: updatedApps,
      chatMessages: [
        ...(trip.chatMessages || []),
        {
          id: `msg-${Date.now()}`,
          tripId: trip.id,
          authorName: 'Бортовой журнал',
          role: 'organizer',
          text: `🎉 К экипажу присоединился ${app.applicantName} (${app.vesselType ? app.vesselType.toUpperCase() : 'судно'})!`,
          timestamp: 'Только что'
        }
      ]
    };
    onUpdateTrip(updatedTrip);
    if (selectedTrip?.id === trip.id) {
      setSelectedTrip(updatedTrip);
    }
  };

  const handleDeclineApplication = (trip: CompanionTrip, app: TripApplication) => {
    const updatedApps = (trip.applications || []).map(a => 
      a.id === app.id ? { ...a, status: 'declined' as const } : a
    );
    const updatedTrip: CompanionTrip = {
      ...trip,
      applications: updatedApps
    };
    onUpdateTrip(updatedTrip);
    if (selectedTrip?.id === trip.id) {
      setSelectedTrip(updatedTrip);
    }
  };

  // Live Cloud Chat & Real-Time Presence Synchronization
  useEffect(() => {
    if (!selectedTrip) {
      setLiveChatMessages([]);
      setChatPresenceList([]);
      return;
    }

    // Set initial messages while listening
    if (selectedTrip.chatMessages && selectedTrip.chatMessages.length > 0) {
      setLiveChatMessages(selectedTrip.chatMessages);
    }

    // 1. Subscribe to instant live messages subcollection (millisecond updates)
    const unsubMessages = TripChatSyncService.subscribeToTripMessages(
      selectedTrip.id,
      (cloudMsgs) => {
        if (cloudMsgs && cloudMsgs.length > 0) {
          setLiveChatMessages(cloudMsgs);
        } else if (selectedTrip.chatMessages && selectedTrip.chatMessages.length > 0) {
          // Bootstrap legacy messages to subcollection if empty
          selectedTrip.chatMessages.forEach((msg) => {
            TripChatSyncService.sendMessage(selectedTrip.id, msg).catch(() => {});
          });
          setLiveChatMessages(selectedTrip.chatMessages);
        }
      }
    );

    // 2. Subscribe to real-time online presence
    const unsubPresence = TripChatSyncService.subscribeToTripPresence(
      selectedTrip.id,
      (presenceList) => {
        setChatPresenceList(presenceList);
      }
    );

    // 3. Heartbeat: broadcast current user presence
    const currentUserId = currentUser?.id || `guest-${Date.now()}`;
    const sendHeartbeat = (isTypingState = false) => {
      if (!selectedTrip) return;
      const isOrg = isTripOrganizer(selectedTrip);
      const isPart = isUserParticipant(selectedTrip);
      TripChatSyncService.updatePresence(selectedTrip.id, {
        userId: currentUserId,
        name: currentUser?.name || 'Гость',
        avatar: currentUser?.avatar || '',
        role: isOrg ? 'organizer' : isPart ? 'participant' : 'guest',
        isOnline: true,
        isTyping: isTypingState
      }).catch(() => {});
    };

    sendHeartbeat(false);
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat(false);
    }, 6000);

    return () => {
      unsubMessages();
      unsubPresence();
      clearInterval(heartbeatInterval);
      if (selectedTrip) {
        TripChatSyncService.leavePresence(selectedTrip.id, currentUserId).catch(() => {});
      }
    };
  }, [selectedTrip?.id, currentUser?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (modalTab === 'chat') {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [liveChatMessages.length, modalTab]);

  const handleChatInputChange = (val: string, trip: CompanionTrip) => {
    setNewChatMessage(val);
    const currentUserId = currentUser?.id || 'guest';

    // Broadcast typing status to all users in chat
    TripChatSyncService.updatePresence(trip.id, {
      userId: currentUserId,
      name: currentUser?.name || 'Гость',
      avatar: currentUser?.avatar || '',
      role: isTripOrganizer(trip) ? 'organizer' : isUserParticipant(trip) ? 'participant' : 'guest',
      isOnline: true,
      isTyping: true
    }).catch(() => {});

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      TripChatSyncService.updatePresence(trip.id, {
        userId: currentUserId,
        name: currentUser?.name || 'Гость',
        isOnline: true,
        isTyping: false
      }).catch(() => {});
    }, 1800);
  };

  const handleSendChatMessage = async (trip: CompanionTrip) => {
    if (!newChatMessage.trim()) return;
    const textToSend = newChatMessage.trim();
    setNewChatMessage('');

    const isOrg = isTripOrganizer(trip);
    const isPart = isUserParticipant(trip);
    const currentUserId = currentUser?.id || `guest-${Date.now()}`;

    // Reset typing immediately
    TripChatSyncService.updatePresence(trip.id, {
      userId: currentUserId,
      name: currentUser?.name || 'Гость',
      isOnline: true,
      isTyping: false
    }).catch(() => {});

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const message: TripChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tripId: trip.id,
      userId: currentUser?.id,
      authorName: currentUser?.name || 'Гость',
      authorAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: isOrg ? 'organizer' : isPart ? 'participant' : 'guest',
      text: textToSend,
      timestamp: timeStr,
      createdAt: Date.now()
    };

    // Optimistic UI update
    setLiveChatMessages((prev) => [...prev, message]);

    // Millisecond write to Firestore subcollection
    try {
      await TripChatSyncService.sendMessage(trip.id, message);
    } catch (err) {
      console.warn('Failed to send real-time chat message:', err);
    }

    // Keep parent trip doc metadata in sync
    const updatedTrip: CompanionTrip = {
      ...trip,
      chatMessages: [...(trip.chatMessages || []), message],
      commentsCount: (trip.commentsCount || 0) + 1
    };
    onUpdateTrip(updatedTrip);
    if (selectedTrip?.id === trip.id) {
      setSelectedTrip(updatedTrip);
    }
  };

  const handleDeleteChatMessage = async (trip: CompanionTrip, messageId: string) => {
    if (window.confirm('Удалить это сообщение?')) {
      setLiveChatMessages((prev) => prev.filter((m) => m.id !== messageId));
      try {
        await TripChatSyncService.removeMessage(trip.id, messageId);
      } catch (err) {
        console.warn('Failed to delete chat message:', err);
      }
      const updatedTrip: CompanionTrip = {
        ...trip,
        chatMessages: (trip.chatMessages || []).filter((m) => m.id !== messageId),
        commentsCount: Math.max(0, (trip.commentsCount || 1) - 1)
      };
      onUpdateTrip(updatedTrip);
      if (selectedTrip?.id === trip.id) {
        setSelectedTrip(updatedTrip);
      }
    }
  };

  // Download GPX track of the trip
  const handleDownloadTripGpx = (trip: CompanionTrip) => {
    if (!trip.gpxTrack || !trip.gpxTrack.coordinates || trip.gpxTrack.coordinates.length === 0) {
      alert('У этого похода еще нет прикрепленного GPX трека.');
      return;
    }
    const mockRoute: RiverRoute = {
      id: trip.id,
      name: trip.gpxTrack.name || trip.title,
      riverName: trip.riverName,
      region: trip.region,
      lengthKm: trip.gpxTrack.lengthKm || 50,
      durationDays: trip.durationDays,
      fstrCategory: trip.fstrCategory,
      intlClass: 'Class II',
      recommendedVessels: trip.vessels,
      startPoint: trip.gpxTrack.startPoint || { name: 'Старт', lat: trip.gpxTrack.coordinates[0][0], lng: trip.gpxTrack.coordinates[0][1] },
      endPoint: trip.gpxTrack.endPoint || { name: 'Финиш', lat: trip.gpxTrack.coordinates[trip.gpxTrack.coordinates.length - 1][0], lng: trip.gpxTrack.coordinates[trip.gpxTrack.coordinates.length - 1][1] },
      coordinates: trip.gpxTrack.coordinates,
      elevationGainM: trip.gpxTrack.elevationGainM || 20,
      elevationProfile: [],
      gpxFileName: trip.gpxFileName || 'trip_route.gpx',
      avgFlowSpeedKmh: 4.0,
      seasonMonths: 'Лето',
      shortDesc: trip.title,
      description: trip.description,
      highlights: [],
      warnings: [],
      mchsRegistrationRequired: true,
      kmnsPermitNeeded: false,
      coverImage: '',
      pois: trip.gpxTrack.waypoints || []
    };

    const gpxStr = generateGpxString(mockRoute);
    const blob = new Blob([gpxStr], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = trip.gpxFileName || `${trip.riverName}_trip_route.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-[#2D332D]">
      
      {/* Hidden file inputs for GPX import */}
      <input
        type="file"
        ref={createGpxFileInputRef}
        accept=".gpx,.kml,.xml"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleCreateGpxUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={editGpxFileInputRef}
        accept=".gpx,.kml,.xml"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleEditGpxUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Header & Main Actions */}
      <div className="bg-white border border-[#E5E0D8] rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A27]">
              Клуб водных экспедиций
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#1A1F1A]">
            Попутчики и Сборные походы ХМАО и ЯНАО
          </h1>
          <p className="text-sm text-[#6B665F] mt-0.5">
            Присоединяйтесь к проверенным экипажам, загружайте GPX треки рек и находите надежную команду для водных походов
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!currentUser) {
                onOpenAuth();
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            className="px-5 py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Организовать поход</span>
          </button>
        </div>
      </div>

      {/* ADMIN ARCHIVE TOGGLE BAR */}
      {isAdmin && (
        <div className="bg-[#FAF7F2] border border-[#E5E0D8] rounded-2xl p-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'active'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'bg-white text-[#4A443E] hover:text-[#2D5A27] border border-[#E5E0D8]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Активные экспедиции ({activeTrips.length})</span>
            </button>

            <button
              onClick={() => setViewTab('archived')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'archived'
                  ? 'bg-[#8B5E3C] text-white shadow-xs'
                  : 'bg-white text-[#8B5E3C] hover:bg-[#F3EDE6] border border-[#E5E0D8]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Архив экспедиций ({archivedTrips.length})</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">Админ</span>
            </button>
          </div>

          <div className="text-[11px] text-[#8B7E6D] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#8B5E3C]" />
            <span>Походы завершаются и уходят в архив автоматически в 12:00 дня старта</span>
          </div>
        </div>
      )}

      {/* Archive Notice Banner when in Archive Mode */}
      {isAdmin && viewTab === 'archived' && (
        <div className="p-4 bg-[#FBF7F0] border border-[#E8DFC9] rounded-2xl flex items-center justify-between gap-3 text-xs text-[#73512F]">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-[#8B5E3C] shrink-0" />
            <div>
              <strong className="font-bold">Архив завершенных экспедиций (Доступно только администраторам):</strong>
              <p className="text-[11px] text-[#8B7E6D] mt-0.5">
                Здесь хранятся все прошедшие походы, полные списки участников с телефонами, походные чаты и прикрепленные GPX треки.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-[#E5E0D8] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[#8B7E6D] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#2D5A27]" />
            Суда:
          </span>

          <button
            onClick={() => setVesselFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              vesselFilter === 'all'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
            }`}
          >
            Все суда
          </button>

          <button
            onClick={() => setVesselFilter('sup')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              vesselFilter === 'sup'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
            }`}
          >
            🏄 SUP-борды
          </button>

          <button
            onClick={() => setVesselFilter('kayak')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              vesselFilter === 'kayak'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
            }`}
          >
            🛶 Байдарки / Каяки
          </button>

          <button
            onClick={() => setVesselFilter('catamaran')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              vesselFilter === 'catamaran'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
            }`}
          >
            ⛵ Катамараны
          </button>

          <button
            onClick={() => setVesselFilter('motorboat')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              vesselFilter === 'motorboat'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'bg-[#F9F7F4] text-[#6B665F] hover:bg-[#EAE7E2]'
            }`}
          >
            🚤 Моторные лодки
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={() => setMyTripsFilter(!myTripsFilter)}
              className={`px-3.5 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
                myTripsFilter
                  ? 'bg-[#E8F1E7] border-[#2D5A27] text-[#2D5A27]'
                  : 'bg-white border-[#E5E0D8] text-[#6B665F] hover:border-[#2D5A27]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Мои походы и заявки</span>
            </button>
          )}
        </div>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTrips.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-[#E5E0D8] rounded-[24px] p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F9F7F4] text-[#8B7E6D] flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#1A1F1A]">Походов с выбранными параметрами не найдено</h3>
            <p className="text-xs text-[#8B7E6D]">
              Попробуйте сбросить фильтры или станьте первым, кто организует экспедицию!
            </p>
          </div>
        )}

        {filteredTrips.map((trip) => {
          const isArchived = isTripExpiredOrArchived(trip);
          const isOrg = isTripOrganizer(trip);
          const isPart = isUserParticipant(trip);
          const userApp = getUserApplication(trip);
          const availableSeats = trip.totalSeats - trip.bookedSeats;
          const pendingAppsCount = (trip.applications || []).filter(a => a.status === 'pending').length;

          return (
            <div
              key={trip.id}
              className={`bg-white border rounded-[28px] p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                isArchived ? 'border-[#E0D7CB] bg-[#FCFAF7]' : 'border-[#E5E0D8]'
              }`}
            >
              <div>
                {/* Status Badges Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                      {trip.region} • {trip.fstrCategory}
                    </span>
                    <span className="text-xs font-bold text-[#8B7E6D]">
                      р. {trip.riverName}
                    </span>
                  </div>

                  {isArchived ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFE9DF] text-[#7A5B3E] border border-[#D9CEBF] flex items-center gap-1">
                      <Archive className="w-3 h-3" />
                      В архиве
                    </span>
                  ) : trip.status === 'recruiting' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Набор: {availableSeats} мест
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                      Экипаж набран
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-black text-[#1A1F1A] line-clamp-2 leading-snug">
                  {trip.title}
                </h3>

                {/* GPX Track Badge if attached */}
                {trip.gpxTrack && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#2D5A27] bg-[#E8F1E7] px-2 py-0.5 rounded-lg border border-[#CDE0CC] flex items-center gap-1">
                      <MapIcon className="w-3 h-3 text-[#2D5A27]" />
                      GPX трек: {trip.gpxTrack.lengthKm} км ({trip.gpxTrack.startPoint?.name || 'Старт'} → {trip.gpxTrack.endPoint?.name || 'Финиш'})
                    </span>
                  </div>
                )}

                {/* My Status Badge */}
                <div className="mt-2">
                  {isActualOrganizer(trip) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D5A27]/10 text-[#2D5A27] text-[11px] font-bold border border-[#2D5A27]/20">
                      <Award className="w-3 h-3" />
                      Вы организатор {pendingAppsCount > 0 && `(Новых заявок: ${pendingAppsCount})`}
                    </span>
                  )}

                  {!isActualOrganizer(trip) && isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB]/10 text-[#2563EB] text-[11px] font-bold border border-[#2563EB]/20">
                      <ShieldCheck className="w-3 h-3" />
                      Администратор {pendingAppsCount > 0 && `(Заявок: ${pendingAppsCount})`}
                    </span>
                  )}

                  {!isActualOrganizer(trip) && !isAdmin && isPart && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8F1E7] text-[#2D5A27] text-[11px] font-bold border border-[#CDE0CC]">
                      <CheckCircle2 className="w-3 h-3" />
                      Вы в основном экипаже
                    </span>
                  )}

                  {!isActualOrganizer(trip) && !isAdmin && !isPart && userApp && userApp.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#B45309] text-[11px] font-bold border border-[#FDE68A]">
                      <Clock className="w-3 h-3" />
                      Заявка на рассмотрении
                    </span>
                  )}

                  {!isActualOrganizer(trip) && !isAdmin && !isPart && userApp && userApp.status === 'declined' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDE8E8] text-[#E54B4B] text-[11px] font-bold border border-[#F8B4B4]">
                      <UserX className="w-3 h-3" />
                      Заявка отклонена
                    </span>
                  )}
                </div>
              </div>

              {/* Trip Dates & Requirements */}
              <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#2D332D]">
                  <span className="flex items-center gap-1 text-[#8B7E6D] font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#2D5A27]" />
                    Даты похода:
                  </span>
                  <strong className="text-[#1A1F1A]">{trip.startDate} — {trip.endDate} ({trip.durationDays} дн.)</strong>
                </div>

                <div className="flex items-center justify-between text-[#2D332D]">
                  <span className="text-[#8B7E6D] font-medium">Требуемый опыт:</span>
                  <strong className="text-[#2D5A27] text-[11px]">{trip.requiredExperience}</strong>
                </div>

                <div className="flex items-center justify-between text-[#2D332D] pt-1.5 border-t border-[#E5E0D8]/70">
                  <span className="text-[#8B7E6D] font-medium">Оргвзнос (расчетно):</span>
                  <strong className="text-[#1A1F1A] text-sm font-black">~{trip.estimatedCostPerPersonRub.toLocaleString()} ₽</strong>
                </div>
              </div>

              {/* Organizer Badge */}
              <div className="flex items-center gap-3 bg-[#F9F7F4] p-2.5 rounded-2xl border border-[#EEEBE6]">
                <img
                  src={trip.organizer.avatar}
                  alt={trip.organizer.name}
                  className="w-9 h-9 rounded-full object-cover border border-[#CDE0CC]"
                />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-[#1A1F1A] truncate flex items-center gap-1">
                    {trip.organizer.name}
                    <Award className="w-3.5 h-3.5 text-[#D97706] shrink-0" title="Капитан / Организатор" />
                  </div>
                  <div className="text-[10px] text-[#8B7E6D] truncate">
                    {trip.organizer.fstrRank} • {trip.organizer.completedTrips} походов
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#E5E0D8]">
                <button
                  onClick={() => {
                    setSelectedTrip(trip);
                    setModalTab('details');
                  }}
                  className="flex-1 py-2.5 px-3 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D332D] text-xs font-bold rounded-xl border border-[#E5E0D8] transition-all flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#2D5A27]" />
                  <span>{isArchived ? 'Архив & Чат' : 'Экипаж & Чат'}</span>
                </button>

                {trip.gpxTrack && (
                  <button
                    onClick={() => {
                      if (onViewOnMainMap) {
                        onViewOnMainMap(trip);
                      } else {
                        setSelectedTrip(trip);
                        setModalTab('map');
                      }
                    }}
                    className="p-2.5 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] text-xs font-bold rounded-xl transition-all shadow-2xs"
                    title="Открыть трек на интерактивной карте рек"
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>
                )}

                {!isArchived && !isOrg && !isPart && (!userApp || userApp.status === 'declined') && (
                  <button
                    disabled={availableSeats <= 0}
                    onClick={() => handleOpenJoinModal(trip)}
                    className="py-2.5 px-3.5 bg-[#2D5A27] hover:bg-[#3D7136] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
                  >
                    <span>Подать заявку</span>
                  </button>
                )}

                {!isArchived && !isOrg && userApp && userApp.status === 'pending' && (
                  <button
                    onClick={() => {
                      setSelectedTrip(trip);
                      setModalTab('chat');
                    }}
                    className="py-2.5 px-3.5 bg-[#FEF3C7] text-[#B45309] text-xs font-bold rounded-xl border border-[#FDE68A] transition-all flex items-center gap-1"
                  >
                    <span>На рассмотрении</span>
                  </button>
                )}

                {!isArchived && isOrg && (
                  <button
                    onClick={() => {
                      setSelectedTrip(trip);
                      setModalTab('applications');
                    }}
                    className="py-2.5 px-3.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Заявки ({pendingAppsCount})</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Trip Full Modal (Details, Map & GPX, Crew, Chat, and Applications) */}
      {selectedTrip && (
        <div className="fixed inset-0 z-[2600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-3xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto text-[#2D332D]">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E5E0D8] pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#E8F1E7] text-[#2D5A27] border border-[#CDE0CC]">
                    {selectedTrip.fstrCategory} • {selectedTrip.region}
                  </span>
                  <span className="text-xs text-[#8B7E6D] font-bold">р. {selectedTrip.riverName}</span>
                  {isTripExpiredOrArchived(selectedTrip) && (
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EFE9DF] text-[#7A5B3E] border border-[#D9CEBF] flex items-center gap-1">
                      <Archive className="w-3 h-3" />
                      Экспедиция в архиве
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-[#1A1F1A]">{selectedTrip.title}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                {isAdmin && isTripExpiredOrArchived(selectedTrip) && (
                  <button
                    onClick={() => handleRestoreArchivedTrip(selectedTrip)}
                    className="px-3 py-1.5 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] border border-[#CDE0CC] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    title="Восстановить экспедицию в активные"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сделать активным</span>
                  </button>
                )}

                {isTripOrganizer(selectedTrip) && (
                  <button
                    onClick={() => setEditingTripInModal({ ...selectedTrip })}
                    className="px-3 py-1.5 bg-[#F9F7F4] hover:bg-[#EAE7E2] text-[#2D5A27] border border-[#CDE0CC] rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    title="Редактировать поход"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Редактировать</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteArchivedTrip(selectedTrip.id)}
                    className="p-2 bg-[#FDE8E8] hover:bg-[#FCD2D2] text-[#E54B4B] rounded-xl border border-[#F8B4B4]"
                    title="Удалить экспедицию"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedTrip(null)}
                  className="p-1.5 rounded-full text-[#8B7E6D] hover:text-[#1A1F1A] hover:bg-[#F9F7F4]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1.5 bg-[#F9F7F4] p-1.5 rounded-2xl border border-[#EEEBE6] overflow-x-auto">
              <button
                onClick={() => setModalTab('details')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  modalTab === 'details'
                    ? 'bg-white text-[#2D5A27] shadow-xs'
                    : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Экипаж и детали</span>
              </button>

              <button
                onClick={() => setModalTab('map')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  modalTab === 'map'
                    ? 'bg-white text-[#2D5A27] shadow-xs'
                    : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Карта и трек GPX</span>
              </button>

              <button
                onClick={() => setModalTab('chat')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  modalTab === 'chat'
                    ? 'bg-white text-[#2D5A27] shadow-xs'
                    : 'text-[#6B665F] hover:text-[#2D5A27]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Походный чат ({(selectedTrip.chatMessages || []).length})</span>
              </button>

              {isTripOrganizer(selectedTrip) && (
                <button
                  onClick={() => setModalTab('applications')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                    modalTab === 'applications'
                      ? 'bg-[#2D5A27] text-white shadow-xs'
                      : 'text-[#2D5A27] hover:bg-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Заявки ({(selectedTrip.applications || []).filter(a => a.status === 'pending').length})</span>
                </button>
              )}
            </div>

            {/* TAB 1: DETAILS & CREW ROSTER */}
            {modalTab === 'details' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Archive Alert in details */}
                {isTripExpiredOrArchived(selectedTrip) && (
                  <div className="p-3 bg-[#FCFAF7] border border-[#E0D7CB] rounded-2xl flex items-center gap-2 text-xs text-[#7A5B3E]">
                    <Archive className="w-4 h-4 text-[#8B5E3C] shrink-0" />
                    <span>Поход находится в архиве (завершен по дате старта). Данные участников и чат сохранены.</span>
                  </div>
                )}

                {/* Organizer Info Banner */}
                <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#EEEBE6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedTrip.organizer.avatar}
                      alt={selectedTrip.organizer.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#2D5A27]"
                    />
                    <div>
                      <div className="text-sm font-bold text-[#1A1F1A] flex items-center gap-1.5">
                        {selectedTrip.organizer.name}
                        <Award className="w-4 h-4 text-[#D97706]" title="Капитан похода" />
                      </div>
                      <div className="text-xs text-[#8B7E6D]">
                        {selectedTrip.organizer.fstrRank} • Опыт: {selectedTrip.organizer.experienceYears} лет
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
                    <a
                      href={`tel:${selectedTrip.organizer.phone}`}
                      className="px-3 py-2 bg-white hover:bg-[#EAE7E2] border border-[#E5E0D8] text-[#2D332D] font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#2D5A27]" />
                      <span>{selectedTrip.organizer.phone}</span>
                    </a>
                    {selectedTrip.organizer.telegram && (
                      <a
                        href={selectedTrip.organizer.telegram.startsWith('http') ? selectedTrip.organizer.telegram : `https://t.me/${selectedTrip.organizer.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-[#2D5A27] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Telegram</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D] mb-1.5">
                    План похода и требования
                  </h4>
                  <p className="text-xs text-[#4A443E] leading-relaxed bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    {selectedTrip.description}
                  </p>
                </div>

                {/* Gear Lists */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#E8F1E7]/50 p-3.5 rounded-2xl border border-[#CDE0CC]">
                    <h5 className="font-bold text-[#2D5A27] flex items-center gap-1 mb-2">
                      <ShieldCheck className="w-4 h-4" />
                      Предоставляется организатором:
                    </h5>
                    <ul className="space-y-1 text-[#2D332D]">
                      {(selectedTrip.gearProvided || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#2D5A27] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#F9F7F4] p-3.5 rounded-2xl border border-[#EEEBE6]">
                    <h5 className="font-bold text-[#1A1F1A] flex items-center gap-1 mb-2">
                      <Users className="w-4 h-4 text-[#8B7E6D]" />
                      Личное снаряжение участника:
                    </h5>
                    <ul className="space-y-1 text-[#4A443E]">
                      {(selectedTrip.requiredPersonalGear || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#8B7E6D]">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Confirmed Crew Roster */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B7E6D]">
                      Основной экипаж ({selectedTrip.participants.length} из {selectedTrip.totalSeats} чел.)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTrip.participants.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-[#F9F7F4] rounded-xl border border-[#EEEBE6] text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#CDE0CC]"
                          />
                          <div>
                            <div className="font-bold text-[#1A1F1A]">{p.name}</div>
                            <div className="text-[10px] text-[#8B7E6D]">{p.role} • {p.vessel.toUpperCase()}</div>
                          </div>
                        </div>

                        {/* Admin or Org sees phone */}
                        {(isAdmin || isTripOrganizer(selectedTrip)) && p.phone && (
                          <span className="text-[11px] font-mono text-[#2D5A27] bg-white px-2 py-1 rounded-lg border border-[#CDE0CC]">
                            {p.phone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MAP & GPX TRACK */}
            {modalTab === 'map' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {selectedTrip.gpxTrack ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D5A27] flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5" />
                          {selectedTrip.gpxTrack.name || `Нитка русла реки ${selectedTrip.riverName}`}
                        </h4>
                        <p className="text-[11px] text-[#8B7E6D]">
                          Интерактивная карта маршрута, стапель, антистапель и путевые ориентиры
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {onViewOnMainMap && (
                          <button
                            onClick={() => {
                              setSelectedTrip(null);
                              onViewOnMainMap(selectedTrip);
                            }}
                            className="px-3.5 py-2 bg-[#E8F1E7] hover:bg-[#D5E6D3] text-[#2D5A27] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                          >
                            <MapIcon className="w-3.5 h-3.5" />
                            <span>Открыть на интерактивной карте</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadTripGpx(selectedTrip)}
                          className="px-3.5 py-2 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Скачать GPX трек</span>
                        </button>
                      </div>
                    </div>

                    <TripRouteMiniMap
                      coordinates={selectedTrip.gpxTrack.coordinates}
                      startPoint={selectedTrip.gpxTrack.startPoint}
                      endPoint={selectedTrip.gpxTrack.endPoint}
                      waypoints={selectedTrip.gpxTrack.waypoints}
                      lengthKm={selectedTrip.gpxTrack.lengthKm}
                      elevationGainM={selectedTrip.gpxTrack.elevationGainM}
                      heightClass="h-72"
                    />

                    {selectedTrip.gpxTrack.waypoints && selectedTrip.gpxTrack.waypoints.length > 0 && (
                      <div className="p-3 bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-2">
                        <h5 className="text-xs font-bold text-[#1A1F1A]">Ключевые точки и ориентиры на маршруте:</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {selectedTrip.gpxTrack.waypoints.map((wp, i) => (
                            <div key={i} className="p-2 bg-white rounded-xl border border-[#E5E0D8]">
                              <div className="font-bold text-[#1A1F1A] flex items-center justify-between">
                                <span>{wp.name}</span>
                                {wp.kmMark !== undefined && <span className="text-[10px] text-[#8B7E6D]">{wp.kmMark} км</span>}
                              </div>
                              <p className="text-[11px] text-[#6B665F] mt-0.5">{wp.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-[#F9F7F4] rounded-2xl border border-[#EEEBE6] space-y-3">
                    <MapIcon className="w-8 h-8 text-[#8B7E6D] mx-auto" />
                    <h4 className="font-bold text-[#1A1F1A] text-sm">GPX трек еще не прикреплен</h4>
                    <p className="text-xs text-[#8B7E6D] max-w-md mx-auto">
                      Организатор похода может загрузить GPX файл через кнопку «Редактировать», чтобы на карте отображалась нитка русла реки.
                    </p>
                    {isTripOrganizer(selectedTrip) && (
                      <button
                        onClick={() => setEditingTripInModal({ ...selectedTrip })}
                        className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl"
                      >
                        Прикрепить GPX трек
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: REAL-TIME INSTANT CHAT & ONLINE PRESENCE */}
            {modalTab === 'chat' && (
              <div className="space-y-3 max-h-[64vh] flex flex-col justify-between">
                
                {/* LIVE ONLINE PRESENCE BAR */}
                <div className="bg-[#F4F1EA] border border-[#E5E0D8] rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-[#1A1F1A]">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                      </span>
                      <span>В чате онлайн:</span>
                      <span className="bg-[#2D5A27] text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                        {Math.max(1, chatPresenceList.filter(p => p.isOnline).length)}
                      </span>
                    </div>

                    {/* Active User Avatars & Badges */}
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {chatPresenceList.filter(p => p.isOnline).map((userPresence) => (
                        <div
                          key={userPresence.userId}
                          className="relative group cursor-pointer"
                          title={`${userPresence.name} (${userPresence.role === 'organizer' ? 'Организатор' : 'Участник'}) — в сети`}
                        >
                          <img
                            src={userPresence.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                            alt={userPresence.name}
                            className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-2xs"
                          />
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#8B7E6D] font-medium hidden sm:flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[#2D5A27] animate-pulse" />
                    <span>Мгновенная доставка</span>
                  </div>
                </div>

                {/* Messages List with Instant Live Stream */}
                <div className="space-y-2.5 overflow-y-auto max-h-[38vh] pr-1 scrollbar-thin">
                  {liveChatMessages.length === 0 && (
                    <div className="py-10 text-center text-xs text-[#8B7E6D] space-y-2 bg-[#F9F7F4] rounded-2xl border border-dashed border-[#DDD7CE]">
                      <MessageSquare className="w-8 h-8 text-[#8B7E6D] mx-auto opacity-50" />
                      <div className="font-bold text-[#1A1F1A]">Сообщений в походе пока нет</div>
                      <p className="text-[11px] text-[#8B7E6D]">
                        Напишите приветствие экипажу или задайте вопрос организатору. Сообщения доставляются онлайн без обновления!
                      </p>
                    </div>
                  )}

                  {liveChatMessages.map((msg) => {
                    const isMyMessage = currentUser && (msg.userId === currentUser.id || msg.authorName.toLowerCase() === currentUser.name.toLowerCase());
                    const canDelete = isMyMessage || isAdmin || isTripOrganizer(selectedTrip);

                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                          msg.role === 'organizer'
                            ? 'bg-[#E8F1E7]/70 border-[#CDE0CC]'
                            : isMyMessage
                            ? 'bg-[#F2F7F1] border-[#DCE8DB]'
                            : 'bg-[#F9F7F4] border-[#EEEBE6]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-[#8B7E6D]">
                          <div className="flex items-center gap-2">
                            {msg.authorAvatar && (
                              <img
                                src={msg.authorAvatar}
                                alt={msg.authorName}
                                className="w-5 h-5 rounded-full object-cover border border-[#CDE0CC]"
                              />
                            )}
                            <span className="font-bold text-[#1A1F1A] flex items-center gap-1.5">
                              {msg.authorName}
                              {msg.role === 'organizer' && (
                                <span className="text-[9px] bg-[#2D5A27] text-white px-1.5 py-0.5 rounded-md font-bold">
                                  Организатор
                                </span>
                              )}
                              {msg.role === 'participant' && (
                                <span className="text-[9px] bg-[#4A7C59] text-white px-1.5 py-0.5 rounded-md font-medium">
                                  Экипаж
                                </span>
                              )}
                              {isMyMessage && (
                                <span className="text-[9px] bg-[#D6E6D4] text-[#2D5A27] px-1 py-0.2 rounded font-bold">
                                  Вы
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8B7E6D]">{msg.timestamp}</span>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteChatMessage(selectedTrip, msg.id)}
                                className="text-[#8B7E6D] hover:text-[#E54B4B] p-0.5 rounded transition-colors"
                                title="Удалить сообщение"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[#2D332D] text-xs leading-relaxed break-words pl-7">{msg.text}</p>
                      </div>
                    );
                  })}

                  {/* TYPING INDICATOR */}
                  {chatPresenceList.some(p => p.isTyping && p.userId !== (currentUser?.id || 'guest')) && (
                    <div className="flex items-center gap-2 text-[11px] text-[#2D5A27] font-semibold bg-[#E8F1E7]/50 px-3 py-1.5 rounded-xl animate-pulse">
                      <div className="flex space-x-1 items-center">
                        <span className="w-1.5 h-1.5 bg-[#2D5A27] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#2D5A27] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#2D5A27] rounded-full animate-bounce"></span>
                      </div>
                      <span>
                        {chatPresenceList
                          .filter(p => p.isTyping && p.userId !== (currentUser?.id || 'guest'))
                          .map(p => p.name)
                          .join(', ')}{' '}
                        печатает сообщение...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* FAST EMOJI REACTIONS */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-sm border-t border-[#EEEBE6]/80">
                  <span className="text-[10px] text-[#8B7E6D] font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Smile className="w-3 h-3 text-[#2D5A27]" />
                    Быстрые:
                  </span>
                  {['👍', '🚣', '🏕️', '🔥', '👏', '⚡', '📍', '🌊'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewChatMessage((prev) => (prev ? `${prev} ${emoji}` : emoji));
                      }}
                      className="px-2 py-0.5 bg-[#F4F1EA] hover:bg-[#EAE7E2] rounded-lg border border-[#E5E0D8] text-xs transition-transform active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Send Input with Online Delivery */}
                <div className="pt-2 border-t border-[#E5E0D8] flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={currentUser ? "Написать онлайн в чат экипажа (Enter для отправки)..." : "Напишите сообщение в походный чат..."}
                    value={newChatMessage}
                    onChange={(e) => handleChatInputChange(e.target.value, selectedTrip)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendChatMessage(selectedTrip);
                      }
                    }}
                    className="flex-1 bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D332D] outline-none focus:border-[#2D5A27] focus:bg-white shadow-inner"
                  />
                  <button
                    onClick={() => handleSendChatMessage(selectedTrip)}
                    disabled={!newChatMessage.trim()}
                    className="px-3.5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 font-bold text-xs"
                  >
                    <span>Отправить</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            )}

            {/* TAB 4: APPLICATIONS (ORGANIZER ONLY) */}
            {modalTab === 'applications' && isTripOrganizer(selectedTrip) && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {(selectedTrip.applications || []).length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8B7E6D]">
                    Заявок на участие пока нет
                  </div>
                ) : (
                  (selectedTrip.applications || []).map((app) => (
                    <div
                      key={app.id}
                      className="p-3.5 bg-[#F9F7F4] border border-[#EEEBE6] rounded-2xl space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#1A1F1A] text-sm">{app.applicantName}</div>
                          <div className="text-[11px] text-[#8B7E6D]">
                            Опыт: {app.experienceLevel} • Судно: {app.vesselType?.toUpperCase()}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === 'accepted' ? 'bg-[#E8F1E7] text-[#2D5A27]' :
                          app.status === 'declined' ? 'bg-[#FDE8E8] text-[#E54B4B]' :
                          'bg-[#FEF3C7] text-[#B45309]'
                        }`}>
                          {app.status === 'accepted' ? 'Принята' : app.status === 'declined' ? 'Отклонена' : 'Ожидает'}
                        </span>
                      </div>

                      {app.notes && (
                        <p className="text-[11px] bg-white p-2 rounded-xl border border-[#E5E0D8] text-[#4A443E]">
                          «{app.notes}»
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-[#E5E0D8]/60 text-[11px]">
                        <div className="flex items-center gap-2 text-[#2D5A27] font-bold font-mono">
                          <Phone className="w-3 h-3" />
                          <span>{app.applicantPhone}</span>
                        </div>

                        {app.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAcceptApplication(selectedTrip, app)}
                              className="px-2.5 py-1 bg-[#2D5A27] text-white rounded-lg font-bold hover:bg-[#3D7136]"
                            >
                              Принять
                            </button>
                            <button
                              onClick={() => handleDeclineApplication(selectedTrip, app)}
                              className="px-2.5 py-1 bg-[#FDE8E8] text-[#E54B4B] rounded-lg font-bold hover:bg-[#FCD2D2]"
                            >
                              Отклонить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Join Trip Application Modal */}
      {joinModalTrip && (
        <div className="fixed inset-0 z-[2700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            
            <div className="flex items-start justify-between border-b border-[#E5E0D8] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1A1F1A]">Подача заявки в экипаж</h3>
                <p className="text-xs text-[#8B7E6D]">{joinModalTrip.title}</p>
              </div>
              <button
                onClick={() => setJoinModalTrip(null)}
                className="p-1 rounded-full text-[#8B7E6D] hover:text-[#1A1F1A] hover:bg-[#F9F7F4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {joinSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#2D5A27] mx-auto" />
                <h4 className="font-black text-[#1A1F1A] text-sm">Заявка успешно отправлена!</h4>
                <p className="text-xs text-[#8B7E6D]">Капитан экспедиции рассмотрит ее и свяжется с вами.</p>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Ваше имя *</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Например: Иван Смирнов"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Номер телефона для связи *</label>
                  <input
                    type="tel"
                    required
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[#4A443E] font-bold mb-1">Ваше судно</label>
                    <select
                      value={applicantVessel}
                      onChange={(e) => setApplicantVessel(e.target.value as VesselType)}
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    >
                      <option value="sup">SUP-борд</option>
                      <option value="kayak">Байдарка / Каяк</option>
                      <option value="catamaran">Катамаран</option>
                      <option value="raft">Рафт</option>
                      <option value="motorboat">Моторная лодка</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#4A443E] font-bold mb-1">Ваш опыт сплавов</label>
                    <input
                      type="text"
                      value={applicantExp}
                      onChange={(e) => setApplicantExp(e.target.value)}
                      placeholder="Например: 2 года, 1-2 к.с."
                      className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Комментарий капитану</label>
                  <textarea
                    rows={2}
                    value={applicantNotes}
                    onChange={(e) => setApplicantNotes(e.target.value)}
                    placeholder="Наличие палатки, снаряжения, готовность взять попутчика..."
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Отправить заявку организатору</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create New Trip Modal with GPX Track Import */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[2800] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl my-6 text-[#2D332D]">
            
            <div className="flex items-start justify-between border-b border-[#E5E0D8] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1A1F1A]">Создание похода / экспедиции</h3>
                <p className="text-xs text-[#8B7E6D]">Опубликуйте маршрут, прикрепите GPX трек и найдите надежный экипаж</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-[#8B7E6D] hover:text-[#1A1F1A] hover:bg-[#F9F7F4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Название похода *</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Сплав по Соби на сапах и байдарках"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              {/* GPX TRACK IMPORT & RIVER LINK */}
              <div className="p-3.5 bg-[#E8F1E7]/70 rounded-2xl border border-[#CDE0CC] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#2D5A27] flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4" />
                      Импорт GPX трека маршрута
                    </label>
                    <p className="text-[11px] text-[#6B665F]">
                      Загрузите файл трека с навигатора или выберите реку из каталога сайта
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => createGpxFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{newGpxTrack ? 'Заменить GPX' : 'Загрузить GPX'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick selector from existing rivers */}
                {routes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6B665F] shrink-0">Или река из каталога:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleSelectCatalogRoute(e.target.value);
                      }}
                      className="bg-white border border-[#CDE0CC] rounded-xl p-1.5 text-xs text-[#2D5A27] font-semibold outline-none flex-1"
                    >
                      <option value="">— Выбрать реку из базы —</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.region}, {r.lengthKm} км)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Interactive Mini-Map Preview when GPX is attached */}
                {newGpxTrack && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#2D5A27] font-bold">
                      <span>✓ Трек загружен: {newGpxTrack.name} ({newGpxTrack.lengthKm} км)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewGpxTrack(undefined);
                          setNewGpxFileName('');
                        }}
                        className="text-[#E54B4B] hover:underline"
                      >
                        Удалить трек
                      </button>
                    </div>

                    <TripRouteMiniMap
                      coordinates={newGpxTrack.coordinates}
                      startPoint={newGpxTrack.startPoint}
                      endPoint={newGpxTrack.endPoint}
                      waypoints={newGpxTrack.waypoints}
                      lengthKm={newGpxTrack.lengthKm}
                      elevationGainM={newGpxTrack.elevationGainM}
                      heightClass="h-44"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Река *</label>
                  <input
                    type="text"
                    required
                    value={newRiver}
                    onChange={(e) => setNewRiver(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Регион</label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value as 'ХМАО' | 'ЯНАО')}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="ХМАО">ХМАО-Югра</option>
                    <option value="ЯНАО">ЯНАО (Ямал)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Дата старта</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Дата финиша</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Всего мест в группе</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={newTotalSeats}
                    onChange={(e) => setNewTotalSeats(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Оргвзнос / Бюджет (₽)</label>
                  <input
                    type="number"
                    step={500}
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">
                    📦 Предоставляется организатором
                    <span className="text-[10px] text-[#8B7E6D] font-normal block">Каждый пункт с новой строки</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Костровое снаряжение&#10;Групповая аптечка&#10;Тент лагерный"
                    value={newGearProvided}
                    onChange={(e) => setNewGearProvided(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">
                    🎒 Личное снаряжение участника
                    <span className="text-[10px] text-[#8B7E6D] font-normal block">Каждый пункт с новой строки</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Спасжилет с сертификатом&#10;Палатка&#10;Спальник по сезону"
                    value={newRequiredGear}
                    onChange={(e) => setNewRequiredGear(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Требуемый опыт</label>
                  <input
                    type="text"
                    placeholder="Например: Средний (2-4 сплава)"
                    value={newExperience}
                    onChange={(e) => setNewExperience(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Ссылка на чат (Telegram)</label>
                  <input
                    type="text"
                    placeholder="https://t.me/..."
                    value={newTelegramLink}
                    onChange={(e) => setNewTelegramLink(e.target.value)}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Описание похода и план заброски</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Расскажите о реке, заброске, походном графике, требованиях к участникам..."
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Опубликовать экспедицию</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Edit Trip Modal (Directly in CompanionsModule) */}
      {editingTripInModal && (
        <div className="fixed inset-0 z-[2850] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[28px] max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl my-auto text-[#2D332D]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#E8F1E7] text-[#2D5A27]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1F1A]">Редактирование параметров похода</h3>
                  <p className="text-[11px] text-[#6B665F]">Измените даты, GPX трек, снаряжение, места и описание</p>
                </div>
              </div>
              <button onClick={() => setEditingTripInModal(null)} className="p-1 rounded-full hover:bg-[#F9F7F4] text-[#8B7E6D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTripInModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Название экспедиции *</label>
                <input
                  type="text"
                  required
                  value={editingTripInModal.title}
                  onChange={(e) => setEditingTripInModal({ ...editingTripInModal, title: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              {/* EDIT GPX TRACK SECTION */}
              <div className="p-3 bg-[#E8F1E7]/60 rounded-2xl border border-[#CDE0CC] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#2D5A27] flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      GPX трек маршрута
                    </label>
                    <p className="text-[10px] text-[#6B665F]">
                      {editingTripInModal.gpxTrack ? `Прикреплен: ${editingTripInModal.gpxTrack.lengthKm} км` : 'Файл трека не загружен'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => editGpxFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#2D5A27] text-white font-bold text-xs rounded-xl"
                  >
                    Загрузить / Заменить GPX
                  </button>
                </div>

                {editingTripInModal.gpxTrack && (
                  <div className="mt-2">
                    <TripRouteMiniMap
                      coordinates={editingTripInModal.gpxTrack.coordinates}
                      startPoint={editingTripInModal.gpxTrack.startPoint}
                      endPoint={editingTripInModal.gpxTrack.endPoint}
                      waypoints={editingTripInModal.gpxTrack.waypoints}
                      lengthKm={editingTripInModal.gpxTrack.lengthKm}
                      elevationGainM={editingTripInModal.gpxTrack.elevationGainM}
                      heightClass="h-40"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Река *</label>
                  <input
                    type="text"
                    required
                    value={editingTripInModal.riverName}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, riverName: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Регион</label>
                  <select
                    value={editingTripInModal.region}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, region: e.target.value as 'ХМАО' | 'ЯНАО' })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="ХМАО">ХМАО-Югра</option>
                    <option value="ЯНАО">ЯНАО (Ямал)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Категория сложности</label>
                  <input
                    type="text"
                    value={editingTripInModal.fstrCategory}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, fstrCategory: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Статус набора</label>
                  <select
                    value={editingTripInModal.status}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, status: e.target.value as any })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  >
                    <option value="recruiting">Набор открыт</option>
                    <option value="confirmed">Группа укомплектована</option>
                    <option value="completed">Поход завершен (Архив)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Дата старта</label>
                  <input
                    type="date"
                    value={editingTripInModal.startDate}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, startDate: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Дата финиша</label>
                  <input
                    type="date"
                    value={editingTripInModal.endDate}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, endDate: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Всего мест в группе</label>
                  <input
                    type="number"
                    min={editingTripInModal.bookedSeats || 1}
                    max={30}
                    value={editingTripInModal.totalSeats}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, totalSeats: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Оргвзнос (₽)</label>
                  <input
                    type="number"
                    value={editingTripInModal.estimatedCostPerPersonRub}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, estimatedCostPerPersonRub: Number(e.target.value) })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Editable Gear Provided & Required */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">
                    📦 Предоставляется организатором
                    <span className="text-[10px] text-[#8B7E6D] font-normal block">Каждый пункт с новой строки</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Костровое снаряжение&#10;Групповая аптечка&#10;Тент лагерный"
                    value={(editingTripInModal.gearProvided || []).join('\n')}
                    onChange={(e) => setEditingTripInModal({ 
                      ...editingTripInModal, 
                      gearProvided: e.target.value.split('\n').filter(s => s.trim().length > 0) 
                    })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">
                    🎒 Личное снаряжение участника
                    <span className="text-[10px] text-[#8B7E6D] font-normal block">Каждый пункт с новой строки</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Спасжилет с сертификатом&#10;Палатка&#10;Спальник по сезону"
                    value={(editingTripInModal.requiredPersonalGear || []).join('\n')}
                    onChange={(e) => setEditingTripInModal({ 
                      ...editingTripInModal, 
                      requiredPersonalGear: e.target.value.split('\n').filter(s => s.trim().length > 0) 
                    })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Требуемый опыт</label>
                  <input
                    type="text"
                    value={editingTripInModal.requiredExperience || ''}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, requiredExperience: e.target.value })}
                    placeholder="Например: Средний (2-4 сплава)"
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A443E] font-bold mb-1">Ссылка на чат (Telegram)</label>
                  <input
                    type="text"
                    placeholder="https://t.me/..."
                    value={editingTripInModal.groupChatLink || ''}
                    onChange={(e) => setEditingTripInModal({ ...editingTripInModal, groupChatLink: e.target.value })}
                    className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A443E] font-bold mb-1">Описание похода и план</label>
                <textarea
                  rows={3}
                  value={editingTripInModal.description}
                  onChange={(e) => setEditingTripInModal({ ...editingTripInModal, description: e.target.value })}
                  className="w-full bg-[#F9F7F4] border border-[#E5E0D8] rounded-xl p-2.5 text-[#2D332D] outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTripInModal(null)}
                  className="px-4 py-2.5 bg-[#F9F7F4] text-[#2D332D] font-bold rounded-xl border border-[#E5E0D8] hover:bg-[#EAE7E2]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#3D7136] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить изменения</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
