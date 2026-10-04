/**
 * Landing DESIGN systems — the layout/typography/treatment layer, independent of
 * the color palette (themes.ts). Every design styles the SAME semantic section
 * markup (see landing-html.ts) but with a distinct aesthetic, so two pages with
 * the same copy look like different brands. Color still comes from the theme's
 * CSS variables (--green/--gold/--cream/--ink/--body/--hair); designs override
 * typography, spacing, shapes, and section treatments.
 */
export interface LandingDesign {
  key: string;
  name: string;
  /** One-line description for the picker. */
  blurb: string;
  css: string;
}

/** Structural CSS shared by every design (reset, animations, sticky bars, form). */
const BASE = `
*{box-sizing:border-box;}
body{margin:0;color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;}
img{display:block;max-width:100%;}
.reveal{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s ease;}
.reveal.in{opacity:1;transform:none;}
@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none;}}
.center{text-align:center;}
.buybar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem 1.5rem;background:rgba(11,34,24,.97);color:#fff;font-weight:600;transform:translateY(110%);transition:transform .25s ease;z-index:50;}
.buybar.show{transform:translateY(0);}
.buybar .btn{padding:.6rem 1.4rem;}
footer{text-align:center;padding:1.5rem;font-size:.75rem;color:#9aa39c;}
.lead-form{max-width:30rem;margin:1.6rem auto 0;display:flex;flex-direction:column;gap:.75rem;text-align:left;}
.lead-form .row{display:grid;gap:.75rem;}
@media(min-width:520px){.lead-form .row{grid-template-columns:1fr 1fr;}}
.lead-form input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.25);border-radius:.7rem;padding:.8rem .9rem;font-size:.95rem;background:rgba(255,255,255,.95);color:#111;}
.lead-form input:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(184,138,42,.25);}
.lead-form .btn{width:100%;text-align:center;border:0;cursor:pointer;font-size:1rem;}
.lead-form .consent{text-align:center;font-size:.75rem;opacity:.7;margin:.2rem 0 0;}
`;

/* ── CLASSIC — the original warm DTC look (green hero, gold accents). ───────── */
const CLASSIC = `
body{font-family:var(--lp-body,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif);line-height:1.55;}
h1,h2{font-family:var(--lp-display,inherit);font-weight:800;letter-spacing:-.02em;margin:0 0 .35em;text-wrap:balance;}
h1{font-size:clamp(2.4rem,5vw,3.4rem);line-height:1.05;}
h2{font-size:clamp(1.7rem,3.5vw,2.5rem);line-height:1.1;}
section{padding:4.5rem 1.5rem;}
.accent{width:3rem;height:4px;border-radius:99px;background:var(--gold);margin:.9rem 0 0;}
.center .accent{margin-left:auto;margin-right:auto;}
.hero{position:relative;overflow:hidden;background:var(--green);color:#fff;text-align:center;}
.hero::before{content:"";position:absolute;top:-6rem;right:-6rem;width:20rem;height:20rem;border-radius:50%;background:rgba(184,138,42,.18);filter:blur(60px);}
.hero .lead,.hero p{color:#cdd6cf;}.hero h2{color:#fff;}
.lead{font-size:1.15rem;max-width:38rem;margin:0 auto 1.7rem;}
.btn{display:inline-block;background:var(--gold);color:var(--green);font-weight:800;padding:.95rem 2rem;border-radius:99px;text-decoration:none;box-shadow:0 10px 24px -8px rgba(184,138,42,.6);transition:transform .15s ease;}
.btn:hover{transform:translateY(-2px);}
.eyebrow{display:inline-block;background:rgba(255,255,255,.1);color:var(--gold);font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:.35rem .9rem;border-radius:99px;margin-bottom:1rem;}
.pills{list-style:none;padding:0;margin:1.6rem auto 0;display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;max-width:42rem;}
.pills li{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#eef2ee;padding:.4rem .9rem;border-radius:99px;font-size:.85rem;}
.band{max-width:62rem;margin:0 auto;}
.band.alt{background:var(--cream);max-width:none;}
.band.alt>*{max-width:62rem;margin-left:auto;margin-right:auto;}
.pains{list-style:none;padding:0;margin-top:1.4rem;display:flex;flex-direction:column;gap:.75rem;}
.pains li{color:var(--body);padding-left:1.6rem;position:relative;}
.pains li::before{content:"✕";position:absolute;left:0;color:#dc4b4b;font-weight:700;}
.grid{display:grid;gap:1.4rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));margin-top:2rem;}
.cell{background:#fff;border:1px solid var(--hair);border-radius:1.1rem;padding:1.5rem;box-shadow:0 1px 3px rgba(16,36,27,.05);transition:transform .15s ease,box-shadow .15s ease;}
.cell:hover{transform:translateY(-4px);box-shadow:0 18px 36px -20px rgba(16,36,27,.3);}
.cell strong{display:block;margin-bottom:.35rem;font-size:1.05rem;}.cell p{color:var(--body);margin:0;}
.feature{background:transparent;border:0;border-left:3px solid rgba(184,138,42,.5);border-radius:0;padding:.2rem 0 .2rem 1.1rem;box-shadow:none;}.feature:hover{transform:none;box-shadow:none;}
.proof{background:linear-gradient(135deg,var(--green),var(--green2));color:#fff;max-width:none;}
.stats{display:flex;flex-wrap:wrap;gap:2.5rem;justify-content:center;margin:2.2rem 0 1rem;}
.stat{display:block;font-size:clamp(2.6rem,6vw,3.6rem);font-weight:800;color:var(--gold);line-height:1;}
.stats small{color:#cdd6cf;text-transform:uppercase;font-size:.72rem;letter-spacing:.06em;margin-top:.4rem;display:block;}
.quote{margin:0;background:#fff;border:1px solid var(--hair);border-radius:1.1rem;padding:1.6rem;box-shadow:0 1px 3px rgba(16,36,27,.05);}
.stars{color:var(--gold);letter-spacing:1px;}
.verified{text-align:center;color:#15803d;font-weight:700;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;margin:.6rem 0 0;}
.quote blockquote{margin:.7rem 0;color:var(--body);font-size:1.02rem;}.quote figcaption{font-weight:700;font-size:.92rem;}
.faqwrap{max-width:42rem;margin:2rem auto 0;display:flex;flex-direction:column;gap:.7rem;}
.faq details{background:#fff;border:1px solid var(--hair);border-radius:1rem;padding:1rem 1.3rem;}
.faq summary{font-weight:700;cursor:pointer;list-style:none;}.faq summary::-webkit-details-marker{display:none;}
.faq p{color:var(--body);margin:.7rem 0 0;}
.urgency{color:var(--gold);font-weight:700;margin-top:1rem;}
.cta{background:linear-gradient(135deg,var(--green),var(--green2));max-width:none;}
.hero.split{text-align:left;}
.hero-grid{display:grid;gap:2.5rem;align-items:center;max-width:66rem;margin:0 auto;position:relative;}
@media(min-width:780px){.hero-grid{grid-template-columns:1.1fr .9fr;}}
.hero.split .lead,.hero.split .pills{margin-left:0;margin-right:0;justify-content:flex-start;}
.hero-img{position:relative;}
.hero-img::before{content:"";position:absolute;inset:0;transform:rotate(-3deg);background:rgba(184,138,42,.22);border-radius:2rem;filter:blur(14px);}
.hero-img img{position:relative;width:100%;max-height:26rem;object-fit:cover;border-radius:2rem;border:1px solid rgba(255,255,255,.15);box-shadow:0 30px 60px -25px rgba(0,0,0,.6);}
.rating{display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;font-size:.85rem;color:#cdd6cf;font-weight:600;}
.hero:not(.split) .rating{justify-content:center;}.rating .stars{color:var(--gold);}
.gallery h2{text-align:center;}.gallery .accent{margin:.9rem auto 0;}
.flavors{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;max-width:60rem;margin:2.2rem auto 0;}
@media(min-width:680px){.flavors{grid-template-columns:repeat(4,1fr);}}
.flavors .card{overflow:hidden;border-radius:1.2rem;border:1px solid var(--hair);background:#fff;box-shadow:0 1px 3px rgba(16,36,27,.06);transition:transform .15s ease;}
.flavors .card:hover{transform:translateY(-4px);}.flavors .card img{aspect-ratio:1/1;width:100%;object-fit:cover;}
.compare{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--hair);border-radius:1.2rem;overflow:hidden;margin:2rem auto 0;max-width:42rem;box-shadow:0 10px 30px -18px rgba(16,36,27,.3);}
.compare th,.compare td{padding:.9rem 1rem;border-bottom:1px solid var(--hair);text-align:center;}
.compare thead .us{background:var(--green);color:var(--gold);}
.compare td:first-child,.compare th:first-child{text-align:left;color:var(--body);}
.compare tbody .us{background:rgba(184,138,42,.07);font-weight:700;}
.compare .yes{color:#15803d;font-weight:800;}.compare .no{color:#c2c2c2;}
.guarantee{max-width:42rem;margin:0 auto;text-align:center;border:1px solid rgba(184,138,42,.3);background:linear-gradient(180deg,rgba(184,138,42,.1),var(--cream));border-radius:1.6rem;padding:2.5rem;box-shadow:0 1px 3px rgba(16,36,27,.05);}
.guarantee .badge{display:inline-block;background:var(--green);color:var(--gold);font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;font-weight:700;padding:.4rem 1rem;border-radius:99px;margin-bottom:1rem;}
.offerbar{position:sticky;top:0;z-index:60;background:var(--gold);color:var(--green);text-align:center;font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;padding:.6rem 1rem;}
.form-section{background:var(--green);color:#fff;}
`;

/* ── EDITORIAL — luxe, minimal, serif, generous whitespace, light hero. ────── */
const EDITORIAL = `
body{font-family:var(--lp-body,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif);line-height:1.7;background:#fff;}
h1,h2{font-family:Georgia,'Iowan Old Style','Times New Roman',serif;font-weight:500;letter-spacing:-.015em;margin:0 0 .5em;text-wrap:balance;}
h1{font-size:clamp(2.6rem,5.5vw,4.2rem);line-height:1.06;}
h2{font-size:clamp(1.9rem,3.5vw,2.8rem);line-height:1.12;}
section{padding:6rem 1.5rem;}
.accent{width:2.5rem;height:1px;background:var(--ink);margin:1.4rem 0 0;opacity:.4;}
.center .accent{margin-left:auto;margin-right:auto;}
.eyebrow{display:inline-block;color:var(--body);font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.22em;margin-bottom:1.6rem;border-bottom:1px solid var(--hair);padding-bottom:.4rem;}
.hero{position:relative;background:var(--cream);color:var(--ink);text-align:center;padding:7rem 1.5rem;}
.hero h1{color:var(--ink);}.hero .lead,.hero p{color:var(--body);}
.lead{font-size:1.2rem;max-width:34rem;margin:0 auto 2.2rem;font-weight:400;}
.btn{display:inline-block;background:var(--ink);color:#fff;font-weight:600;letter-spacing:.02em;padding:1rem 2.6rem;border-radius:0;text-decoration:none;transition:opacity .15s ease;text-transform:uppercase;font-size:.82rem;}
.btn:hover{opacity:.82;}
.pills{list-style:none;padding:0;margin:2.2rem auto 0;display:flex;flex-wrap:wrap;gap:.4rem 2rem;justify-content:center;max-width:44rem;}
.pills li{color:var(--body);font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;}
.band{max-width:56rem;margin:0 auto;}
.band.alt{background:var(--cream);max-width:none;}.band.alt>*{max-width:56rem;margin-left:auto;margin-right:auto;}
.pains{list-style:none;padding:0;margin-top:1.8rem;display:flex;flex-direction:column;gap:1rem;}
.pains li{color:var(--body);padding-left:1.8rem;position:relative;font-size:1.08rem;border-bottom:1px solid var(--hair);padding-bottom:1rem;}
.pains li::before{content:"—";position:absolute;left:0;color:var(--ink);}
.grid{display:grid;gap:0;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));margin-top:2.5rem;border-top:1px solid var(--hair);}
.cell{background:transparent;border:0;border-bottom:1px solid var(--hair);border-right:1px solid var(--hair);border-radius:0;padding:2rem 1.8rem;box-shadow:none;}
.cell strong{display:block;margin-bottom:.6rem;font-size:1.15rem;font-family:Georgia,serif;font-weight:500;}
.cell p{color:var(--body);margin:0;}
.feature{border-right:0;}
.proof{background:var(--ink);color:#fff;max-width:none;text-align:center;}
.proof h2{color:#fff;}
.stats{display:flex;flex-wrap:wrap;gap:3.5rem;justify-content:center;margin:2.8rem 0 1rem;}
.stat{display:block;font-family:Georgia,serif;font-size:clamp(2.8rem,6vw,4rem);font-weight:500;color:#fff;line-height:1;}
.stats small{color:rgba(255,255,255,.6);text-transform:uppercase;font-size:.7rem;letter-spacing:.14em;margin-top:.6rem;display:block;}
.quote{margin:0;background:transparent;border:0;border-top:1px solid var(--hair);border-radius:0;padding:2rem 0 0;}
.stars{color:var(--body);letter-spacing:2px;font-size:.8rem;}
.verified{text-align:center;color:var(--body);font-weight:600;font-size:.7rem;text-transform:uppercase;letter-spacing:.14em;margin:.6rem 0 0;}
.quote blockquote{margin:1rem 0;color:var(--ink);font-size:1.2rem;font-family:Georgia,serif;font-style:italic;line-height:1.5;}
.quote figcaption{font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--body);}
.faqwrap{max-width:44rem;margin:2.5rem auto 0;}
.faq details{border-bottom:1px solid var(--hair);padding:1.4rem 0;}
.faq summary{font-weight:500;cursor:pointer;list-style:none;font-size:1.12rem;font-family:Georgia,serif;}
.faq summary::-webkit-details-marker{display:none;}
.faq p{color:var(--body);margin:1rem 0 0;}
.urgency{color:var(--body);letter-spacing:.1em;text-transform:uppercase;font-size:.78rem;margin-top:1.4rem;}
.cta{background:var(--cream);text-align:center;max-width:none;}.cta h2{color:var(--ink);}.cta .lead{color:var(--body);}
.hero.split{text-align:left;}
.hero-grid{display:grid;gap:3.5rem;align-items:center;max-width:70rem;margin:0 auto;}
@media(min-width:780px){.hero-grid{grid-template-columns:1fr 1fr;}}
.hero.split .lead,.hero.split .pills{margin-left:0;justify-content:flex-start;}
.hero-img img{width:100%;max-height:32rem;object-fit:cover;border-radius:0;}
.rating{display:flex;align-items:center;gap:.6rem;margin-bottom:1.4rem;font-size:.78rem;color:var(--body);letter-spacing:.06em;text-transform:uppercase;}
.hero:not(.split) .rating{justify-content:center;}.rating .stars{color:var(--ink);}
.gallery h2{text-align:center;}.gallery .accent{margin:1.4rem auto 0;}
.flavors{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem;max-width:64rem;margin:2.8rem auto 0;}
@media(min-width:680px){.flavors{grid-template-columns:repeat(4,1fr);}}
.flavors .card{overflow:hidden;border-radius:0;background:var(--cream);}
.flavors .card img{aspect-ratio:3/4;width:100%;object-fit:cover;}
.compare{width:100%;border-collapse:collapse;background:transparent;border:0;margin:2.5rem auto 0;max-width:44rem;}
.compare th,.compare td{padding:1.1rem 1rem;border-bottom:1px solid var(--hair);text-align:center;}
.compare thead th{font-family:Georgia,serif;font-weight:500;font-size:1.05rem;}
.compare thead .us{color:var(--ink);border-bottom:2px solid var(--ink);}
.compare td:first-child,.compare th:first-child{text-align:left;color:var(--body);}
.compare tbody .us{font-weight:600;color:var(--ink);}
.compare .yes{color:var(--ink);font-weight:700;}.compare .no{color:#cfcfcf;}
.guarantee{max-width:40rem;margin:0 auto;text-align:center;border:1px solid var(--ink);background:transparent;border-radius:0;padding:3rem 2.5rem;}
.guarantee .badge{display:inline-block;color:var(--body);font-size:.7rem;text-transform:uppercase;letter-spacing:.16em;font-weight:600;margin-bottom:1.2rem;}
.offerbar{position:sticky;top:0;z-index:60;background:var(--ink);color:#fff;text-align:center;font-weight:500;font-size:.72rem;text-transform:uppercase;letter-spacing:.18em;padding:.7rem 1rem;}
.form-section{background:var(--ink);color:#fff;text-align:center;}.form-section h2{color:#fff;}
.form-section .lead-form input{border-radius:0;}
`;

/* ── BOLD — high-contrast, chunky, energetic (supplements/fitness). ────────── */
const BOLD = `
body{font-family:var(--lp-body,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif);line-height:1.55;}
h1,h2{font-family:'Helvetica Neue',Arial,sans-serif;font-weight:900;letter-spacing:-.03em;margin:0 0 .3em;text-transform:uppercase;text-wrap:balance;}
h1{font-size:clamp(2.6rem,6vw,4.4rem);line-height:.98;}
h2{font-size:clamp(2rem,4.5vw,3.2rem);line-height:1;}
section{padding:4.5rem 1.5rem;}
.accent{width:4rem;height:6px;background:var(--gold);margin:1rem 0 0;}
.center .accent{margin-left:auto;margin-right:auto;}
.eyebrow{display:inline-block;background:var(--gold);color:var(--green);font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;padding:.4rem 1rem;border-radius:.4rem;margin-bottom:1.1rem;}
.hero{position:relative;overflow:hidden;background:var(--green);color:#fff;text-align:center;padding:5.5rem 1.5rem;}
.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% -10%,rgba(184,138,42,.35),transparent 45%);}
.hero>*{position:relative;}
.hero .lead,.hero p{color:#e7ede8;}.hero h2{color:#fff;}
.lead{font-size:1.25rem;max-width:40rem;margin:0 auto 1.9rem;font-weight:500;}
.btn{display:inline-block;background:var(--gold);color:var(--green);font-weight:900;text-transform:uppercase;letter-spacing:.02em;padding:1.1rem 2.6rem;border-radius:.7rem;text-decoration:none;box-shadow:0 8px 0 -2px rgba(0,0,0,.25);transition:transform .1s ease;}
.btn:hover{transform:translateY(-2px);}.btn:active{transform:translateY(1px);}
.pills{list-style:none;padding:0;margin:1.8rem auto 0;display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;max-width:44rem;}
.pills li{background:rgba(255,255,255,.12);color:#fff;padding:.5rem 1rem;border-radius:.5rem;font-size:.85rem;font-weight:700;}
.band{max-width:64rem;margin:0 auto;}
.band.alt{background:var(--cream);max-width:none;}.band.alt>*{max-width:64rem;margin-left:auto;margin-right:auto;}
.pains{list-style:none;padding:0;margin-top:1.6rem;display:flex;flex-direction:column;gap:.8rem;}
.pains li{background:#fff;border-left:6px solid #dc4b4b;padding:1rem 1.2rem;border-radius:.5rem;font-weight:600;color:var(--ink);box-shadow:0 2px 0 rgba(16,36,27,.06);}
.grid{display:grid;gap:1.2rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));margin-top:2.2rem;}
.cell{background:var(--green);color:#fff;border:0;border-radius:1rem;padding:1.7rem;box-shadow:0 10px 0 -4px rgba(16,36,27,.18);transition:transform .12s ease;}
.cell:hover{transform:translateY(-4px);}
.cell strong{display:block;margin-bottom:.4rem;font-size:1.15rem;color:var(--gold);text-transform:uppercase;letter-spacing:-.01em;}
.cell p{color:#e7ede8;margin:0;}
.feature{background:var(--cream);color:var(--ink);border-left:6px solid var(--gold);border-radius:.5rem;box-shadow:none;}
.feature strong{color:var(--green);}.feature p{color:var(--body);}
.proof{background:var(--green);color:#fff;max-width:none;}
.stats{display:flex;flex-wrap:wrap;gap:2rem;justify-content:center;margin:2.2rem 0 1rem;}
.stat{display:block;font-family:'Helvetica Neue',Arial,sans-serif;font-size:clamp(3rem,7vw,4.6rem);font-weight:900;color:var(--gold);line-height:.9;letter-spacing:-.03em;}
.stats small{color:#e7ede8;text-transform:uppercase;font-size:.74rem;letter-spacing:.06em;margin-top:.5rem;display:block;font-weight:700;}
.quote{margin:0;background:#fff;border:0;border-radius:1rem;padding:1.7rem;box-shadow:0 8px 0 -3px rgba(16,36,27,.1);}
.stars{color:var(--gold);letter-spacing:1px;}
.verified{text-align:center;color:#15803d;font-weight:800;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;margin:.6rem 0 0;}
.quote blockquote{margin:.7rem 0;color:var(--ink);font-size:1.05rem;font-weight:500;}.quote figcaption{font-weight:800;font-size:.9rem;text-transform:uppercase;}
.faqwrap{max-width:44rem;margin:2.2rem auto 0;display:flex;flex-direction:column;gap:.8rem;}
.faq details{background:#fff;border:0;border-radius:.7rem;padding:1.1rem 1.4rem;box-shadow:0 3px 0 rgba(16,36,27,.08);}
.faq summary{font-weight:800;cursor:pointer;list-style:none;text-transform:uppercase;font-size:.95rem;}
.faq summary::-webkit-details-marker{display:none;}.faq p{color:var(--body);margin:.7rem 0 0;}
.urgency{color:var(--gold);font-weight:900;text-transform:uppercase;margin-top:1.1rem;}
.cta{background:var(--green);max-width:none;text-align:center;}
.cta::before{content:"";position:absolute;}
.hero.split{text-align:left;}
.hero-grid{display:grid;gap:2.5rem;align-items:center;max-width:66rem;margin:0 auto;}
@media(min-width:780px){.hero-grid{grid-template-columns:1.05fr .95fr;}}
.hero.split .lead,.hero.split .pills{margin-left:0;justify-content:flex-start;}
.hero-img img{width:100%;max-height:28rem;object-fit:cover;border-radius:1.2rem;border:4px solid var(--gold);box-shadow:0 16px 0 -6px rgba(0,0,0,.3);}
.rating{display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;font-size:.85rem;color:#e7ede8;font-weight:800;text-transform:uppercase;}
.hero:not(.split) .rating{justify-content:center;}.rating .stars{color:var(--gold);}
.gallery h2{text-align:center;}.gallery .accent{margin:1rem auto 0;}
.flavors{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;max-width:60rem;margin:2.2rem auto 0;}
@media(min-width:680px){.flavors{grid-template-columns:repeat(4,1fr);}}
.flavors .card{overflow:hidden;border-radius:1rem;border:3px solid var(--green);background:#fff;transition:transform .12s ease;}
.flavors .card:hover{transform:translateY(-4px) rotate(-1deg);}.flavors .card img{aspect-ratio:1/1;width:100%;object-fit:cover;}
.compare{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:3px solid var(--green);border-radius:1rem;overflow:hidden;margin:2.2rem auto 0;max-width:44rem;}
.compare th,.compare td{padding:1rem;border-bottom:1px solid var(--hair);text-align:center;font-weight:600;}
.compare thead th{text-transform:uppercase;font-weight:900;font-size:.85rem;}
.compare thead .us{background:var(--gold);color:var(--green);}
.compare td:first-child,.compare th:first-child{text-align:left;color:var(--body);}
.compare tbody .us{background:rgba(184,138,42,.12);font-weight:900;}
.compare .yes{color:#15803d;font-weight:900;font-size:1.15rem;}.compare .no{color:#d0d0d0;font-size:1.15rem;}
.guarantee{max-width:42rem;margin:0 auto;text-align:center;border:4px solid var(--gold);background:var(--green);color:#fff;border-radius:1.2rem;padding:2.6rem;}
.guarantee h2{color:#fff;}.guarantee p{color:#e7ede8;}
.guarantee .badge{display:inline-block;background:var(--gold);color:var(--green);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;font-weight:900;padding:.5rem 1.2rem;border-radius:.5rem;margin-bottom:1.1rem;}
.offerbar{position:sticky;top:0;z-index:60;background:var(--gold);color:var(--green);text-align:center;font-weight:900;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em;padding:.7rem 1rem;}
.form-section{background:var(--green);color:#fff;text-align:center;}.form-section h2{color:#fff;}
`;

export const LANDING_DESIGNS: LandingDesign[] = [
  { key: "classic", name: "Classic", blurb: "Warm DTC — green hero, gold accents", css: CLASSIC },
  { key: "editorial", name: "Editorial", blurb: "Luxe & minimal — serif, lots of whitespace", css: EDITORIAL },
  { key: "bold", name: "Bold", blurb: "High-contrast & punchy — big type, chunky blocks", css: BOLD },
];

export const DESIGN_KEYS = LANDING_DESIGNS.map((d) => d.key);
const DEFAULT_DESIGN = "classic";

/** Stable hash → pick a design when the choice is "auto" (varies by product). */
function hashPick(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return LANDING_DESIGNS[h % LANDING_DESIGNS.length]!.key;
}

/** Resolve a stored/selected design key to a concrete one. */
export function resolveDesign(key: string | null | undefined, seed = ""): string {
  if (key && DESIGN_KEYS.includes(key)) return key;
  return seed ? hashPick(seed) : DEFAULT_DESIGN;
}

export function getDesignCss(key: string | null | undefined): string {
  const d = LANDING_DESIGNS.find((x) => x.key === key) ?? LANDING_DESIGNS[0]!;
  return BASE + d.css;
}
