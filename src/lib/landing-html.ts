/**
 * Serializes a generated landing page to a self-contained, shippable HTML file
 * (inline CSS, no external assets). Mirrors the on-brand preview so what the
 * user sees is what they download. The visual DESIGN (layout/typography) comes
 * from designs.ts; the COLOR palette comes from themes.ts — both applied here.
 */
import { getTheme } from "@/modules/landing/application/themes";
import { getDesignCss, resolveDesign } from "@/modules/landing/application/designs";
import type { SectionType } from "@/modules/landing/application/landing-schema";
import type {
  PageVersionView,
  SectionView,
  HeroContent,
  ProblemContent,
  BenefitsContent,
  FeaturesContent,
  ComparisonContent,
  SocialProofContent,
  TestimonialsContent,
  GuaranteeContent,
  FaqContent,
  CtaContent,
  FormContent,
  GalleryContent,
} from "@/modules/landing";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const button = (label: string) =>
  `<a href="#lead-form" class="btn">${esc(label)}</a>`;

const headLeft = (text: string) => `<h2>${esc(text)}</h2><div class="accent"></div>`;
const headCenter = (text: string) => `<div class="center"><h2>${esc(text)}</h2><div class="accent"></div></div>`;

function sectionHtml(section: SectionView): string {
  switch (section.type) {
    case "HERO": {
      const c = section.content as HeroContent;
      const copy = `<div class="hero-copy">
  <span class="eyebrow">★ Limited-time offer</span>
  <div class="rating"><span class="stars">★★★★★</span> <span>Loved by thousands of customers</span></div>
  <h1>${esc(c.headline)}</h1>
  <p class="lead">${esc(c.subheadline)}</p>
  <div>${button(c.ctaLabel)}</div>
  ${c.supportingPoints?.length ? `<ul class="pills">${c.supportingPoints.map((p) => `<li>✓ ${esc(p)}</li>`).join("")}</ul>` : ""}
</div>`;
      return c.image
        ? `<section class="hero split"><div class="hero-grid">${copy}<div class="hero-img"><img src="${esc(c.image)}" alt=""></div></div></section>`
        : `<section class="hero">${copy}</section>`;
    }
    case "GALLERY": {
      const c = section.content as GalleryContent;
      if (!c.images?.length) return "";
      return `<section class="band gallery center">
  ${headCenter("Find your favourite")}
  <div class="flavors">${c.images
    .slice(0, 8)
    .map((src) => `<div class="card"><img src="${esc(src)}" alt=""></div>`)
    .join("")}</div>
</section>`;
    }
    case "COMPARISON": {
      const c = section.content as ComparisonContent;
      const cell = (on: boolean) => (on ? `<span class="yes">✓</span>` : `<span class="no">✕</span>`);
      return `<section class="band alt center">
  ${headCenter(c.headline)}
  <table class="compare">
    <thead><tr><th></th><th class="us">${esc(c.productLabel)}</th><th>${esc(c.alternativeLabel)}</th></tr></thead>
    <tbody>${c.rows
      .map((r) => `<tr><td>${esc(r.point)}</td><td class="us">${cell(r.hasProduct)}</td><td>${cell(r.hasAlternative)}</td></tr>`)
      .join("")}</tbody>
  </table>
</section>`;
    }
    case "GUARANTEE": {
      const c = section.content as GuaranteeContent;
      return `<section class="band">
  <div class="guarantee">
    <span class="badge">${esc(c.badge)}</span>
    <h2>${esc(c.headline)}</h2>
    <p>${esc(c.body)}</p>
  </div>
</section>`;
    }
    case "PROBLEM": {
      const c = section.content as ProblemContent;
      return `<section class="band">
  ${headLeft(c.headline)}
  <p>${esc(c.body)}</p>
  <ul class="pains">${c.painPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
</section>`;
    }
    case "BENEFITS": {
      const c = section.content as BenefitsContent;
      return `<section class="band alt center">
  ${headCenter(c.headline)}
  <div class="grid">${c.items
    .map((b) => `<div class="cell"><strong>${esc(b.title)}</strong><p>${esc(b.description)}</p></div>`)
    .join("")}</div>
</section>`;
    }
    case "FEATURES": {
      const c = section.content as FeaturesContent;
      return `<section class="band">
  ${headLeft(c.headline)}
  <div class="grid">${c.items
    .map((f) => `<div class="cell feature"><strong>${esc(f.title)}</strong><p>${esc(f.description)}</p></div>`)
    .join("")}</div>
</section>`;
    }
    case "SOCIAL_PROOF": {
      const c = section.content as SocialProofContent;
      return `<section class="hero proof">
  <h2>${esc(c.headline)}</h2>
  ${c.stats?.length ? `<div class="stats">${c.stats.map((s) => `<div><span class="stat">${esc(s.value)}</span><small>${esc(s.label)}</small></div>`).join("")}</div>` : ""}
  ${c.highlights?.length ? `<ul class="pills">${c.highlights.map((h) => `<li>✓ ${esc(h)}</li>`).join("")}</ul>` : ""}
</section>`;
    }
    case "TESTIMONIALS": {
      const c = section.content as TestimonialsContent;
      return `<section class="band alt center">
  ${headCenter(c.headline)}
  ${c.verified ? `<p class="verified">✓ Verified customer reviews</p>` : ""}
  <div class="grid">${c.items
    .map(
      (t) =>
        `<figure class="quote"><div class="stars">★★★★★</div><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.author)}${t.role ? ` · ${esc(t.role)}` : ""}</figcaption></figure>`,
    )
    .join("")}</div>
</section>`;
    }
    case "FAQ": {
      const c = section.content as FaqContent;
      return `<section class="band">
  ${headCenter(c.headline)}
  <div class="faq faqwrap">${c.items
    .map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`)
    .join("")}</div>
</section>`;
    }
    case "CTA": {
      const c = section.content as CtaContent;
      return `<section class="hero cta">
  <h2>${esc(c.headline)}</h2>
  <p class="lead">${esc(c.subheadline)}</p>
  <div>${button(c.buttonLabel)}</div>
  ${c.urgency ? `<p class="urgency">${esc(c.urgency)}</p>` : ""}
</section>`;
    }
    case "FORM": {
      const c = section.content as FormContent;
      return `<section class="hero form-section" id="lead-form">
  <h2>${esc(c.headline)}</h2>
  <p class="lead">${esc(c.subheadline)}</p>
  <form class="lead-form" onsubmit="return false;">
    <div class="row">
      <input type="text" name="firstName" placeholder="First name" autocomplete="given-name" required>
      <input type="text" name="lastName" placeholder="Last name" autocomplete="family-name" required>
    </div>
    <input type="tel" name="phone" placeholder="Phone number" autocomplete="tel" required>
    <input type="email" name="email" placeholder="Email address" autocomplete="email" required>
    <button type="submit" class="btn">${esc(c.buttonLabel)}</button>
    ${c.consent ? `<p class="consent">${esc(c.consent)}</p>` : ""}
  </form>
</section>`;
    }
    default:
      return "";
  }
}

/** Maps the chosen palette + fonts onto the export stylesheet's CSS variables. */
function themeRootCss(themeKey: string | null): string {
  const t = getTheme(themeKey);
  const v = t.vars;
  return `:root{--green:${v["--color-green-950"]};--green2:${v["--color-green-800"]};--gold:${v["--color-gold-500"]};--ink:${v["--color-ink"]};--body:${v["--color-body"]};--cream:${v["--color-cream-50"]};--hair:${v["--color-hairline"]};--lp-display:${t.fonts.display};--lp-body:${t.fonts.body};}`;
}

/** Render a single section's inner HTML — used by the builder for live, in-place updates. */
export function sectionToHtml(type: SectionType, content: unknown): string {
  return sectionHtml({ id: "", type, position: 0, content } as SectionView);
}

export function landingToHtml(
  version: PageVersionView,
  productName: string,
  opts?: { interactive?: boolean; accent?: string },
): string {
  const interactive = opts?.interactive ?? false;
  // Each section wrapped in .reveal for scroll-in animation; tagged for the
  // builder's click↔highlight bridge when used interactively.
  const body = version.sections
    .map((s, i) => `<div class="reveal"${interactive ? ` data-lp-index="${i}"` : ""}>${sectionHtml(s)}</div>`)
    .join("\n");
  const hero = version.sections.find((s) => s.type === "HERO")?.content as HeroContent | undefined;
  const cta = version.sections.find((s) => s.type === "CTA")?.content as CtaContent | undefined;
  const ctaLabel = hero?.ctaLabel ?? "Get started";
  const offer = cta?.urgency ?? hero?.supportingPoints?.[0] ?? "Free shipping · 30-day money-back guarantee";
  const fontHref = getTheme(version.theme).fonts.href;
  const designCss = getDesignCss(resolveDesign(version.design, productName));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(productName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(fontHref)}">
<style>${themeRootCss(version.theme)}${designCss}</style>
</head>
<body>
<div class="offerbar">★ ${esc(offer)}</div>
${body}
<div id="buybar" class="buybar"><span>${esc(productName)}</span>${button(ctaLabel)}</div>
<footer>Generated by GrowthOS · ${esc(version.framework)} framework · v${version.version}</footer>
<script>
(function(){
  var b=document.getElementById('buybar');
  function t(){if(window.scrollY>600){b.classList.add('show');}else{b.classList.remove('show');}}
  window.addEventListener('scroll',t,{passive:true});t();
  var els=[].slice.call(document.querySelectorAll('.reveal'));
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in');});return;}
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
  els.forEach(function(e){io.observe(e);});
})();
${
  interactive
    ? `(function(){
  var ACCENT=${JSON.stringify(opts?.accent ?? "#d8a94b")};
  document.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-lp-index]');
    if(el){parent.postMessage({source:'lp',type:'select',index:Number(el.getAttribute('data-lp-index'))},'*');}
  });
  window.addEventListener('message',function(e){
    var d=e.data; if(!d||d.source!=='lp-parent')return;
    if(d.type==='highlight'){
      document.querySelectorAll('[data-lp-index]').forEach(function(s){s.style.outline='';s.style.outlineOffset='';});
      if(d.index==null)return;
      var t=document.querySelector('[data-lp-index="'+d.index+'"]');
      if(t){t.style.outline='3px solid '+ACCENT;t.style.outlineOffset='-3px';t.scrollIntoView({behavior:'smooth',block:'center'});}
    } else if(d.type==='update' && d.index!=null){
      // Live, in-place content edit — no reload.
      var el=document.querySelector('[data-lp-index="'+d.index+'"]');
      if(el){el.innerHTML=d.html;}
    }
  });
})();`
    : ""
}
</script>
</body>
</html>`;
}
