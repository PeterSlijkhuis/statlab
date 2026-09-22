import { useEffect, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import type { LessonMeta } from '../content/manifest';
import { prefersReducedMotion } from './celebrate';

/** A thin bar across the top of the window that fills as the lesson is read. */
export function ReadingProgress() {
  const [fraction, setFraction] = useState(0);
  useEffect(() => {
    let frame = 0;
    function measure() {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      setFraction(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="reading-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${fraction})` }} />
    </div>
  );
}

type Section = { id: string; title: string };

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

/**
 * The lesson's own h2 headings as a short list of steps, with the one being
 * read highlighted. Seeing a lesson as four chunks rather than one long page
 * is most of what makes it feel short.
 */
export function SectionGuide({ article, contentKey }: { article: RefObject<HTMLElement | null>; contentKey: unknown }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const root = article.current;
    if (!root || !contentKey) {
      setSections([]);
      return;
    }
    const headings = [...root.querySelectorAll('h2')];
    const used = new Set<string>();
    const found = headings.map((heading) => {
      let id = heading.id || slug(heading.textContent ?? '');
      while (used.has(id)) id += '-2';
      used.add(id);
      heading.id = id;
      return { id, title: heading.textContent ?? '' };
    });
    setSections(found);
    setCurrent(found[0]?.id ?? null);

    if (typeof IntersectionObserver === 'undefined' || !found.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [article, contentKey]);

  if (sections.length < 2) return null;
  const index = Math.max(0, sections.findIndex((section) => section.id === current));

  return (
    <aside className="section-guide" aria-label="In this lesson">
      <p className="section-guide-title">In this lesson <span>{index + 1} of {sections.length}</span></p>
      <ol>
        {sections.map((section, i) => (
          <li key={section.id} className={i < index ? 'passed' : i === index ? 'current' : undefined}>
            <a
              href={`#${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(section.id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
              }}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/**
 * Blocks drift up into place as they scroll into view. Code blocks are left
 * alone: the R console is the part of the page that teaches, and it should
 * never be moving when a student reaches for it.
 */
export function useReveal(article: RefObject<HTMLElement | null>, contentKey: unknown) {
  useEffect(() => {
    const root = article.current;
    if (!root || !contentKey || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return;
    const blocks = [...root.querySelectorAll<HTMLElement>('.choice-block, .exercise, .ci, .clt, .correlation, .distribution, .leastsquares, .pvalue, .lesson blockquote, .lesson h2')];
    const below = blocks.filter((block) => block.getBoundingClientRect().top > window.innerHeight);
    below.forEach((block) => block.classList.add('reveal'));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    below.forEach((block) => observer.observe(block));
    return () => {
      observer.disconnect();
      below.forEach((block) => block.classList.remove('reveal', 'revealed'));
    };
  }, [article, contentKey]);
}

type FinishProps = {
  complete: boolean;
  passed: number;
  total: number;
  next?: LessonMeta;
  previous?: LessonMeta;
};

/** The end of a lesson: what is left to do here, and a big way into the next one. */
export function LessonFinish({ complete, passed, total, next, previous }: FinishProps) {
  return (
    <section className={`lesson-finish${complete ? ' complete' : ''}`}>
      <div className="lesson-finish-status">
        <span className="lesson-finish-icon" aria-hidden="true">{complete ? '🎉' : '🧩'}</span>
        <div>
          <p className="lesson-finish-title">{complete ? 'Lesson complete' : total ? 'Almost there' : 'End of the lesson'}</p>
          <p className="lesson-finish-detail">
            {total === 0
              ? 'No exercises here: reading it through counts.'
              : complete
                ? `All ${total} exercise${total === 1 ? '' : 's'} solved.`
                : `${passed} of ${total} exercise${total === 1 ? '' : 's'} solved. Finish the rest to complete the lesson.`}
          </p>
        </div>
      </div>
      <nav className="lesson-nav">
        {previous && <Link to={`/lesson/${previous.id}`} className="lesson-prev"><small>Previous</small>← {previous.title}</Link>}
        {next && (
          <Link to={`/lesson/${next.id}`} className="lesson-next button-primary">
            <small>Up next</small>{next.title} →
          </Link>
        )}
        {!next && <Link to="/" className="lesson-next button-primary"><small>You reached the end</small>Back to the course →</Link>}
      </nav>
    </section>
  );
}
