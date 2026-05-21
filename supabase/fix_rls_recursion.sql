-- ================================================
-- FIX: Infinite recursion in family_members RLS
-- Exécutez ce script dans Supabase SQL Editor
-- ================================================

-- ÉTAPE 1: Supprimer TOUTES les anciennes politiques
DROP POLICY IF EXISTS "View family members" ON public.family_members;
DROP POLICY IF EXISTS "Family admins can manage members" ON public.family_members;
DROP POLICY IF EXISTS "Family members can view their families" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Family admins can update their families" ON public.families;
DROP POLICY IF EXISTS "View family transactions" ON public.transactions;
DROP POLICY IF EXISTS "Create family transactions" ON public.transactions;
DROP POLICY IF EXISTS "Update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Delete own transactions" ON public.transactions;
DROP POLICY IF EXISTS "View family recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Manage family recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "View family loans" ON public.loans;
DROP POLICY IF EXISTS "Manage family loans" ON public.loans;
DROP POLICY IF EXISTS "View family budgets" ON public.budgets;
DROP POLICY IF EXISTS "Manage family budgets" ON public.budgets;
DROP POLICY IF EXISTS "View family savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Manage family savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "View family subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Family admins manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "View family payments" ON public.payments;
DROP POLICY IF EXISTS "Family admins create payments" ON public.payments;
DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Plans are publicly readable" ON public.plans;

-- ================================================
-- ÉTAPE 2: Créer une fonction helper pour éviter la récursion
-- ================================================
CREATE OR REPLACE FUNCTION public.get_user_family_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_in_family(p_user_id UUID, p_family_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.family_members 
  WHERE user_id = p_user_id AND family_id = p_family_id
  LIMIT 1;
$$;

-- ================================================
-- ÉTAPE 3: Recréer les politiques SANS récursion
-- ================================================

-- USERS
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PLANS (lecture publique)
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT USING (true);

-- FAMILY_MEMBERS (politique simple sans récursion)
CREATE POLICY "family_members_select" ON public.family_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "family_members_insert" ON public.family_members
  FOR INSERT WITH CHECK (
    -- Peut s'ajouter soi-même
    user_id = auth.uid()
    OR
    -- Les admins peuvent ajouter des membres
    family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE user_id = auth.uid() 
      AND role IN ('family_admin', 'super_admin')
    )
  );

CREATE POLICY "family_members_delete" ON public.family_members
  FOR DELETE USING (
    family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE user_id = auth.uid() 
      AND role IN ('family_admin', 'super_admin')
    )
  );

-- FAMILIES
CREATE POLICY "families_select" ON public.families
  FOR SELECT USING (
    id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "families_insert" ON public.families
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "families_update" ON public.families
  FOR UPDATE USING (created_by = auth.uid());

-- SUBSCRIPTIONS
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

-- PAYMENTS
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

-- TRANSACTIONS
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
    AND user_id = auth.uid()
  );

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

-- RECURRING EXPENSES
CREATE POLICY "recurring_expenses_all" ON public.recurring_expenses
  FOR ALL USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

-- LOANS
CREATE POLICY "loans_all" ON public.loans
  FOR ALL USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

-- LOAN PAYMENTS
CREATE POLICY "loan_payments_all" ON public.loan_payments
  FOR ALL USING (
    loan_id IN (
      SELECT id FROM public.loans 
      WHERE family_id IN (SELECT public.get_user_family_ids(auth.uid()))
    )
  );

-- BUDGETS
CREATE POLICY "budgets_all" ON public.budgets
  FOR ALL USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

-- SAVINGS GOALS
CREATE POLICY "savings_goals_all" ON public.savings_goals
  FOR ALL USING (
    family_id IN (SELECT public.get_user_family_ids(auth.uid()))
  );

-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ================================================
-- SUCCÈS !
-- ================================================
SELECT 'Politiques RLS corrigées avec succès !' as message;
