// Central icon registry -- maps the iconName strings stored in data/mockData.js
// (and eventually in Supabase rows) to actual lucide-react components.
import {
  LayoutDashboard, Users, ClipboardList, Sparkles, FileText, Dumbbell,
  ListChecks, BarChart3, Rss, BookOpen, Compass, UsersRound, User, Bookmark,
  Search, Bell, MessageSquare, Heart, MessageCircle, Share2, Plus, BadgeCheck,
  Play, Image as ImageIcon, Video, FlaskConical, X, ChevronDown, ChevronLeft,
  ChevronRight, UserPlus, Check, Send, MapPin, Star, GraduationCap, Award,
  Trophy, Languages, ShieldCheck, Clock, Activity, Zap, MoreHorizontal, Link2,
  SlidersHorizontal, Building2, ExternalLink, Menu,
} from "lucide-react";

export const ICONS = {
  LayoutDashboard, Users, ClipboardList, Sparkles, FileText, Dumbbell,
  ListChecks, BarChart3, Rss, BookOpen, Compass, UsersRound, User, Bookmark,
  Search, Bell, MessageSquare, Heart, MessageCircle, Share2, Plus, BadgeCheck,
  Play, ImageIcon, Video, FlaskConical, X, ChevronDown, ChevronLeft,
  ChevronRight, UserPlus, Check, Send, MapPin, Star, GraduationCap, Award,
  Trophy, Languages, ShieldCheck, Clock, Activity, Zap, MoreHorizontal, Link2,
  SlidersHorizontal, Building2, ExternalLink, Menu,
};

export function Icon({ name, ...props }) {
  const Cmp = ICONS[name] || Sparkles;
  return <Cmp {...props} />;
}
