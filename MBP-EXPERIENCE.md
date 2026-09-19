# MBP Experience Architecture

Flagship digital house for MBP Lingerie. Built on the existing Next.js + Express + `mbp_kv` stack. No schema wipe. No fake numbers.

## North star

A Nigerian lingerie house that feels like a private showroom: arrival, discovery, desire, confidence, proof, action.

## What stays

- Guest checkout + Paystack
- WhatsApp `+2348087504905`
- First-party analytics only
- `mbp_kv` as source of truth
- Admin JWT, product/order/review CMS
- Cart / wishlist local persistence

## Storefront journey

1. **Arrival** — cinematic hero, typewriter, scroll-through
2. **Discovery** — moods (Everyday / After dark) + guided intents
3. **Desire** — curated product rails
4. **Confidence** — fit, size, discreet delivery
5. **World** — wardrobe, details, atmosphere
6. **Proof** — real CMS reviews only
7. **Relationship** — concierge, stay close

## Commerce

- Product cards: image swap, badges, wishlist, quick view, add, WhatsApp
- PDP: gallery, size required, WhatsApp order message, related + recent
- Search: command overlay with intents
- Cart drawer + WhatsApp cart message
- Shop URL filters (`sort`, `badge`, category)

## Admin OS (existing, lifted)

Dashboard and analytics read real `orders`, `analytics_events`, and `presence`. Featured/reviews stay CMS-driven.

## Stack

Framer Motion + CSS depth. No Three.js. No extra motion libraries.

## Out of this pass

Customer accounts (no shopper auth exists; guest checkout remains). Variant-level inventory rewrite. Promo redemption (admin codes exist, checkout apply is a later additive API).
