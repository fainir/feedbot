-- Add INSERT and DELETE policies for feed_items
-- So authenticated users can manage items in their own feeds

create policy "Users can insert items into own feeds" on public.feed_items
  for insert with check (
    exists (select 1 from public.feeds where feeds.id = feed_items.feed_id and feeds.user_id = auth.uid())
  );

create policy "Users can delete items from own feeds" on public.feed_items
  for delete using (
    exists (select 1 from public.feeds where feeds.id = feed_items.feed_id and feeds.user_id = auth.uid())
  );

-- Add DELETE policy for notifications (needed for feed deletion cascade)
create policy "Users can delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);
