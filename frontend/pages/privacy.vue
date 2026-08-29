<script setup lang="ts">
/**
 * The privacy notice, in plain words: what we keep, why, who sees it, how
 * long, and what you can do about it (POPIA). No legalese, no popup. The
 * mark, not the voice, throughout.
 */
import type { SiteSetting } from '~/types/payload-types'

useShareMeta({
  title: 'Privacy',
  description:
    'What Bathong. keeps about you, why, who sees it, how long, and how to see, fix or delete it.',
})

const { data: settings } = await useCmsData<SiteSetting>('site-settings', '/api/globals/site-settings')
const contact = computed(() => settings.value?.contactEmail || 'hello@bathong.africa')
</script>

<template>
  <div class="chapter">
    <ChapterHead title="Privacy" />
    <div class="notice">
      <p class="b-lede">
        Bathong. Collective keeps as little about you as it can, and tells you what it keeps.
        This is that notice.
      </p>

      <h3 class="b-kicker">What we keep</h3>
      <p>
        With an account: your name, your email, a password hash (never the password), whether the
        email is confirmed, your membership plan and status, and your newsletter preference. When
        you join: the orders behind your membership (plan, amount, reference, when it was paid).
        When you take part: RSVPs to walks (name, email, a note), photocall entries (the frames,
        a title and statement, our written response), and anything you add to your public profile.
      </p>

      <h3 class="b-kicker">Why</h3>
      <p>
        To run the collective: sign you in, keep your place on a walk, judge and answer an entry,
        activate your membership, credit your photographs. Nothing is sold, shared for advertising,
        or used to profile you.
      </p>

      <h3 class="b-kicker">Who sees it</h3>
      <p>
        The editorial team, on the site's admin. Your public profile is public only when you switch
        it on. RSVP lists and entries stay with the editors. Photographs you publish carry your name,
        because credit is the rule here.
      </p>

      <h3 class="b-kicker">Where it lives</h3>
      <p>
        On a server the collective runs, and on the collective's own mail server for the emails we
        send you. The site sets one cookie, for your session, and none for tracking. Fonts and maps
        are served from our own server. Page views are counted with Plausible, a cookieless
        analytics tool on a server we run; it records the page and the country, not you.
      </p>

      <h3 class="b-kicker">How long</h3>
      <p>
        Until you close your account. Then your account and personal details are deleted, RSVPs and
        entries are anonymised, and photographs and essays you published stay on the site with your
        name on them, as agreed when you published. Walk RSVPs made without an account are deleted
        on request.
      </p>

      <h3 class="b-kicker">Your rights (POPIA)</h3>
      <p>
        You can see what we hold, correct it, and delete it. Your desk shows most of it, your profile
        page edits it, and your security page changes your password or email, signs out any device,
        and deletes your account. For anything else, write to
        <a :href="`mailto:${contact}`">{{ contact }}</a> from the address on the account and we do it
        by hand. You can also complain to the Information Regulator of South Africa.
      </p>

      <h3 class="b-kicker">Email</h3>
      <p>
        We email you about your account and your membership because we have to. Everything else,
        walks, calls, news, only if you ticked the box, and you can untick it any time.
      </p>

      <p class="b-caption muted">Last changed 30 August 2026.</p>
    </div>
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 62ch;
}
.notice h3 {
  margin-top: var(--space-3);
  color: var(--grey-ghost);
}
.notice a {
  color: var(--signal);
}
.muted {
  color: var(--grey-ghost);
  margin-top: var(--space-4);
}
</style>
