# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People create shareable birthday or special-event letter pages for someone to
celebrate. Friends and family open the link to send wishes and virtual gifts.
An administrator reviews pages, wishes, reports, contributions, and recurring
campaigns.

## Product Purpose

Batify makes celebration playful and engaging through a shared digital
experience. Its purpose is virtual appreciation: people can make someone feel
remembered even when they are not exchanging physical gifts or money.

## Positioning

A single shareable link pairs a personal letter with timed wishes and a
gift-opening experience. Virtual gifts are a way to make messages feel special;
spending money or sending a physical gift is not required.

## Operating Context

Batify is a React web app backed by Supabase. It has no user accounts: a private
edit link gives the page owner access, while `/admin` uses a server-configured
secret kept in the current browser tab's session storage. Seasonal campaigns
use Philippine time; their pages become available automatically during their
configured lead-in and close after the campaign.

## Capabilities and Constraints

- Users can create birthday, anniversary, and seasonal pages, share a public
  link, collect wishes, and manage the page through its private edit link.
- Wishes can include a message, virtual gift, and optional photo or video.
- Owners can schedule when wishes are revealed and moderate them.
- Optional GCash details and contributions are supported; they are not required
  for Batify's appreciation experience.
- Public pages expire according to their occasion; owners and administrators
  retain access to expired pages.
- Seasonal campaign dates, descriptions, enablement, and suggested gifts are
  administered through the campaign controls.
- The developer's public byline is Jimz, and the published contact email is
  jamesttamayo0604@gmail.com.
- The app is designed for the web and currently uses React, Vite, Tailwind CSS,
  Supabase, and Cloudflare Turnstile.

## Brand Commitments

The product name is Batify and its tagline is “Bati na, may pa-gift pa.”
The tone is playful and warm, with appreciation and shared fun at the center.

## Evidence on Hand

The repository contains the working app, product copy, campaign configuration,
and gift illustrations. There are no supplied testimonials or further
biographical facts about the developer; the origin story should stay within
the facts the developer provided.

## Product Principles

- Make it easy to celebrate through one shareable link.
- Keep appreciation meaningful without requiring money or a physical gift.
- Protect the private edit link and the contents of scheduled wishes.
- Make the experience welcoming and usable on mobile as well as desktop.

## Accessibility & Inclusion

Preserve the existing semantic controls, keyboard access, and reduced-motion
support. No formal conformance target has been specified.
