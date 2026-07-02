import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/layout';
import { OnboardingPage } from './pages/onboarding-page';
import { DashboardPage } from './pages/dashboard-page';
import { TriagePage } from './pages/triage-page';
import { NoticeboardPage } from './pages/noticeboard-page';
import { VaultPage } from './pages/vault-page';
import { LegalPage } from './pages/legal-page';
import { TermsPage } from './pages/terms-page';
import { PrivacyPage } from './pages/privacy-page';
import { DeleteAccountPage } from './pages/delete-account-page';
import { SupportPage } from './pages/support-page';
import { NotificationsPage } from './pages/notifications-page';
import { AdvisoryPage } from './pages/advisory-page';
import { VibePage } from './pages/vibe-page';
import { FuelPage } from './pages/fuel-page';
import { HouseholdExpensePage } from './pages/household-expense-page';
import { ShoppingPage } from './pages/shopping-page';
import { ResourcePage } from './pages/resource-page';
import { ArrivalPage } from './pages/arrival-page';
import { WolliSuburbStatsPage } from './pages/wolli-pages';
import { OfficialEventPage } from './pages/official-event-page';
import { PrivatePlanPage } from './pages/private-plan-page';
import { PlanInviteRedirectPage } from './pages/plan-invite-redirect-page';
import { PrivatePlanInviteRedirectPage } from './pages/private-plan-invite-redirect-page';
import { AppRouteErrorBoundary } from './components/app-route-error-boundary';
import { HoodieShareRedirectPage } from './pages/hoodie-share-redirect-page';
import { HoodieGuidePage } from './pages/hoodie-guide-page';
import { HoodieSuburbPage } from './pages/hoodie-suburb-page';
import { ExecutionCommandCentrePage } from './pages/execution-command-centre-page';
import { AgentsPage } from './pages/agents-page';
import { FreeElectricityGuidePage } from './pages/free-electricity-guide-page';
import { PitchDeckPage } from './pages/pitch-deck-page';
import { GamesPage } from './pages/games-page';

const AppIndexPage = OnboardingPage;

export const router = createBrowserRouter([
  {
    path: '/pitch-deck',
    Component: PitchDeckPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/agents',
    Component: AgentsPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/agents/*',
    Component: AgentsPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/execution',
    Component: ExecutionCommandCentrePage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/terms',
    Component: TermsPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/privacy',
    Component: PrivacyPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/delete-account',
    Component: DeleteAccountPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/support',
    Component: SupportPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/advisory',
    Component: AdvisoryPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/invite/plan/:source/:slug/:planId',
    Component: PlanInviteRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/invite/private-plan/:planId',
    Component: PrivatePlanInviteRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/share/event/:source/:slug',
    Component: HoodieShareRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/share/plan/:source/:slug/:planId',
    Component: HoodieShareRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/share/guide/:citySlug/:guideSlug',
    Component: HoodieShareRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/share/suburb/:suburbSlug',
    Component: HoodieShareRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/share/address-check',
    Component: HoodieShareRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/share/scam-check',
    Component: HoodieShareRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/share/household-invite/:token',
    Component: HoodieShareRedirectPage,
    ErrorBoundary: AppRouteErrorBoundary,
  },
  {
    path: '/',
    Component: AppLayout,
    ErrorBoundary: AppRouteErrorBoundary,
    children: [
      { index: true, Component: AppIndexPage },
      { path: 'login', Component: OnboardingPage },
      { path: 'dashboard', Component: DashboardPage },
      { path: 'fuel', Component: FuelPage },
      { path: 'household/expenses', Component: HouseholdExpensePage },
      { path: 'shopping', Component: ShoppingPage },
      { path: 'triage', Component: TriagePage },
      { path: 'vibe', Component: VibePage },
      { path: 'games', Component: GamesPage },
      { path: 'guides/free-electricity-australia-2026', Component: FreeElectricityGuidePage },
      { path: 'guide/:citySlug/:guideSlug', Component: HoodieGuidePage },
      { path: 'suburb/:suburbSlug', Component: HoodieSuburbPage },
      { path: 'noticeboard', Component: NoticeboardPage },
      { path: 'profile', Component: VaultPage },
      { path: 'legal', Component: LegalPage },
      { path: 'legal/:listingId', Component: LegalPage },
      { path: 'setu', Component: ResourcePage },
      { path: 'suburb-stats', Component: WolliSuburbStatsPage },
      { path: 'arrival', Component: ArrivalPage },
      { path: 'events/:source/:slug', Component: OfficialEventPage },
      { path: 'plans/:planId', Component: PrivatePlanPage },
      { path: 'notifications', Component: NotificationsPage },
    ],
  },
]);
