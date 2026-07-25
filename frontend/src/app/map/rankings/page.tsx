"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Info,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import rankingData from "@/data/university-rankings.json";
import universityData from "@/data/universities.json";

type RankKey = "QS" | "ARWU" | "USNews" | "THE";
type SortKey = RankKey | "all";
type RangeFilter = "all" | "50" | "100";

interface RankingRecord {
  id: string;
  chineseName: string;
  QS: number | null;
  ARWU: number | null;
  USNews: number | null;
  THE: number | null;
  description: string;
}

interface UniversityDirectoryRecord {
  name: string;
  chineseName: string;
}

const RANK_KEYS: RankKey[] = ["QS", "USNews", "THE", "ARWU"];

const RANK_SYSTEMS: Array<{
  key: SortKey;
  label: string;
  shortLabel: string;
  focus: string;
}> = [
  { key: "all", label: "四榜参考", shortLabel: "综合", focus: "交叉查看四套体系的差异" },
  { key: "QS", label: "QS 世界大学排名", shortLabel: "QS", focus: "学术与雇主声誉、国际化" },
  { key: "USNews", label: "U.S. News 全球大学", shortLabel: "US News", focus: "研究表现与全球学术声誉" },
  { key: "THE", label: "泰晤士高等教育", shortLabel: "THE", focus: "教学、研究、产业与国际视野" },
  { key: "ARWU", label: "软科世界大学学术排名", shortLabel: "ARWU", focus: "科研成果与学术影响力" },
];

const KEY_LABELS: Record<RankKey, string> = {
  QS: "QS",
  USNews: "US News",
  THE: "THE",
  ARWU: "ARWU",
};

const ENGLISH_NAME_FALLBACKS: Record<string, string> = {
  "密歇根州立大学": "Michigan State University",
  "宾夕法尼亚州立大学": "Pennsylvania State University",
  "加州大学圣迭戈分校": "University of California, San Diego",
  "加州大学圣巴巴拉分校": "University of California, Santa Barbara",
  "伊利诺伊大学厄巴纳-香槟分校": "University of Illinois Urbana-Champaign",
  "马里兰大学科利奇帕克分校": "University of Maryland, College Park",
  "密歇根大学": "University of Michigan—Ann Arbor",
  "得克萨斯大学奥斯汀分校": "University of Texas—Austin",
};

function normalizedName(value: string): string {
  return value.toLowerCase().replace(/[·.,'’—–\-\s]/g, "");
}

const englishNameByChineseName = new Map(
  ((universityData as { universities: UniversityDirectoryRecord[] }).universities ?? []).map((university) => [
    normalizedName(university.chineseName),
    university.name,
  ])
);

function englishNameFor(record: RankingRecord): string {
  return ENGLISH_NAME_FALLBACKS[record.chineseName]
    ?? englishNameByChineseName.get(normalizedName(record.chineseName))
    ?? record.id.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function matchesSearch(record: RankingRecord, query: string): boolean {
  const normalizedQuery = normalizedName(query);
  if (!normalizedQuery) return true;
  return normalizedName(record.chineseName).includes(normalizedQuery)
    || normalizedName(englishNameFor(record)).includes(normalizedQuery)
    || normalizedName(record.id).includes(normalizedQuery)
    || normalizedName(locationFrom(record.description)).includes(normalizedQuery);
}

function averageRank(record: RankingRecord): number {
  const values = RANK_KEYS.map((key) => record[key]).filter(
    (value): value is number => typeof value === "number"
  );
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 9999;
}

function sortValue(record: RankingRecord, key: SortKey): number {
  return key === "all" ? averageRank(record) : record[key] ?? 9999;
}

function rankTone(rank: number): string {
  if (rank <= 10) return "bg-jade text-white";
  if (rank <= 30) return "bg-cobalt text-white";
  if (rank <= 50) return "bg-persimmon text-white";
  if (rank <= 100) return "bg-ink/10 text-ink/70";
  return "bg-ink/5 text-ink/50";
}

function locationFrom(description: string): string {
  const match = description.match(/位于(.+?)[，,]/);
  return match?.[1] ?? "美国";
}

function subjectsFrom(description: string): string[] {
  const match = description.match(/优势学科：(.+?)(?:，创建于|$)/);
  if (!match) return [];
  return match[1]
    .split(/[、，]/)
    .map((subject) => subject.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function displayRank(record: RankingRecord, key: RankKey): string {
  const sourceName = key === "USNews" ? "US News" : key;
  const escaped = sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = record.description.match(
    new RegExp(`${escaped}第(=?)(\\d+)(?:[-–](\\d+))?`)
  );
  if (match) {
    if (match[3]) return `${match[2]}–${match[3]}`;
    return `${match[1]}${match[2]}`;
  }
  return record[key] == null ? "—" : String(record[key]);
}

function isRangeRank(record: RankingRecord, key: RankKey): boolean {
  return displayRank(record, key).includes("–");
}

function RankValue({ record, rankKey, active }: { record: RankingRecord; rankKey: RankKey; active: boolean }) {
  const value = record[rankKey];
  return (
    <div className={active ? "font-semibold text-ink" : "text-ink/54"}>
      <span>{displayRank(record, rankKey)}</span>
      {value != null && isRangeRank(record, rankKey) && (
        <span className="ml-1 text-[9px] font-normal text-ink/30">区间</span>
      )}
    </div>
  );
}

export default function RankingsPage() {
  const records = rankingData as RankingRecord[];
  const [activeRank, setActiveRank] = useState<SortKey>("all");
  const [search, setSearch] = useState("");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeSystem = RANK_SYSTEMS.find((system) => system.key === activeRank) ?? RANK_SYSTEMS[0];

  const visibleRecords = useMemo(() => {
    const cutoff = rangeFilter === "all" ? Infinity : Number(rangeFilter);
    return [...records]
      .filter((record) => {
        return matchesSearch(record, search) && sortValue(record, activeRank) <= cutoff;
      })
      .sort((a, b) => sortValue(a, activeRank) - sortValue(b, activeRank));
  }, [activeRank, rangeFilter, records, search]);

  const searchMatches = useMemo(() => {
    if (!search.trim()) return [];
    return [...records]
      .filter((record) => matchesSearch(record, search))
      .sort((a, b) => sortValue(a, activeRank) - sortValue(b, activeRank))
      .slice(0, 6);
  }, [activeRank, records, search]);

  const selectedRecords = useMemo(
    () => selectedIds.map((id) => records.find((record) => record.id === id)).filter(Boolean) as RankingRecord[],
    [records, selectedIds]
  );

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  return (
    <main className="flex-1 bg-paper" aria-label="大学排名对比">
      <section className="border-b border-line/60 bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/48 transition hover:text-ink"
          >
            <ArrowLeft size={14} /> 返回首页
          </Link>
          <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-panel">
                  <BarChart3 size={21} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-ink sm:text-3xl">排名对比</h1>
                  <p className="mt-1 text-sm text-ink/48">Ranking comparison</p>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/62 sm:text-base">
                综合 US News、QS、THE 与 ARWU 四套排名体系，查看同一所大学在不同评价标准下的位置，不用单一名次替你做决定。
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line/50 border-y border-line/50 py-3 lg:border-b-0 lg:border-t-0 lg:py-0">
              <div className="px-4 first:pl-0 lg:first:pl-4">
                <div className="text-xl font-bold text-ink">{records.length}</div>
                <div className="mt-0.5 text-[11px] text-ink/42">所美国大学</div>
              </div>
              <div className="px-4">
                <div className="text-xl font-bold text-ink">4</div>
                <div className="mt-0.5 text-[11px] text-ink/42">套排名体系</div>
              </div>
              <div className="px-4">
                <div className="text-xl font-bold text-ink">2–4</div>
                <div className="mt-0.5 text-[11px] text-ink/42">所院校对比</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line/50 bg-white/72">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="排名体系">
            {RANK_SYSTEMS.map((system) => {
              const active = activeRank === system.key;
              return (
                <button
                  key={system.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveRank(system.key)}
                  className={
                    "shrink-0 rounded-lg border px-4 py-2.5 text-left transition active:scale-[0.98] " +
                    (active
                      ? "border-ink bg-ink text-panel shadow-sm"
                      : "border-line/50 bg-panel text-ink hover:border-ink/25")
                  }
                >
                  <span className="block text-xs font-semibold">{system.shortLabel}</span>
                  <span className={"mt-0.5 block text-[10px] " + (active ? "text-panel/62" : "text-ink/38")}>
                    {system.focus}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative z-20 block">
              <span className="sr-only">搜索大学中英文名或城市</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/32" size={16} />
              <input
                type="search"
                aria-label="搜索大学中文名或英文名"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索大学中文名或英文名"
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-line/60 bg-panel pl-10 pr-4 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-cobalt/60"
              />
              {search.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] overflow-hidden rounded-lg border border-line/70 bg-white shadow-xl shadow-ink/10">
                  <div className="flex items-center justify-between border-b border-line/40 px-3 py-2 text-[10px] text-ink/38">
                    <span>搜索结果</span>
                    <span>{searchMatches.length ? `${searchMatches.length} 所匹配` : "0 所匹配"}</span>
                  </div>
                  {searchMatches.length > 0 ? (
                    <div className="divide-y divide-line/30">
                      {searchMatches.map((record) => {
                        const selected = selectedIds.includes(record.id);
                        const disabled = !selected && selectedIds.length >= 4;
                        return (
                          <button
                            key={record.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              toggleSelected(record.id);
                              setSearch("");
                            }}
                            className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-sm font-semibold text-ink">{record.chineseName}</span>
                                <span className="truncate text-[11px] text-ink/42" lang="en">{englishNameFor(record)}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink/38">
                                <span className="inline-flex items-center gap-1"><MapPin size={10} />{locationFrom(record.description)}</span>
                                <span>QS {displayRank(record, "QS")}</span>
                                <span>US News {displayRank(record, "USNews")}</span>
                                <span>THE {displayRank(record, "THE")}</span>
                              </div>
                            </div>
                            <span className={
                              "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold " +
                              (selected ? "bg-jade/10 text-jade" : "bg-ink/5 text-ink/54")
                            }>
                              {selected ? <Check size={11} /> : <Plus size={11} />}
                              {selected ? "已加入" : "加入对比"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-ink/46">没有找到这所大学</p>
                      <p className="mt-1 text-[10px] text-ink/30">请尝试完整中文名或英文名</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/36" size={15} />
              <select
                aria-label="名次范围"
                value={rangeFilter}
                onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}
                className="h-11 min-w-40 appearance-none rounded-lg border border-line/60 bg-panel pl-9 pr-9 text-sm text-ink outline-none focus:border-cobalt/60"
              >
                <option value="all">全部名次</option>
                <option value="50">Top 50</option>
                <option value="100">Top 100</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/32" size={15} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <section aria-labelledby="compare-heading" className="border-b border-line/60 pb-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="compare-heading" className="text-lg font-semibold text-ink">院校横向对比</h2>
              <p className="mt-1 text-xs leading-5 text-ink/44">从下方榜单选择 2–4 所大学，对照它们在四套体系中的差异。</p>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink/42 transition hover:text-ink"
              >
                <X size={13} /> 清空选择
              </button>
            )}
          </div>

          {selectedRecords.length === 0 ? (
            <div className="mt-4 flex min-h-24 items-center justify-center border-y border-dashed border-line/70 text-center">
              <div className="px-4 py-5">
                <Trophy className="mx-auto text-ink/18" size={22} />
                <p className="mt-2 text-sm text-ink/42">尚未选择大学</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border-y border-line/60">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-medium text-ink/38">
                    <th className="px-3 py-3">大学</th>
                    {RANK_KEYS.map((key) => <th key={key} className="px-3 py-3 text-center">{KEY_LABELS[key]}</th>)}
                    <th className="px-3 py-3 text-center">四榜参考均值</th>
                    <th className="w-10 px-2 py-3"><span className="sr-only">移除</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/35">
                  {selectedRecords.map((record) => (
                    <tr key={record.id} className="bg-white/50">
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-ink">{record.chineseName}</div>
                        <div className="mt-0.5 text-[10px] text-ink/40" lang="en">{englishNameFor(record)}</div>
                        <div className="mt-0.5 text-[10px] text-ink/32">{locationFrom(record.description)}</div>
                      </td>
                      {RANK_KEYS.map((key) => (
                        <td key={key} className="px-3 py-3 text-center text-sm"><RankValue record={record} rankKey={key} active={activeRank === key} /></td>
                      ))}
                      <td className="px-3 py-3 text-center text-sm font-semibold text-ink">{Math.round(averageRank(record))}</td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelected(record.id)}
                          className="grid h-7 w-7 place-items-center rounded-md text-ink/30 transition hover:bg-ink/5 hover:text-ink"
                          aria-label={`移除${record.chineseName}`}
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="ranking-table-heading" className="pt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="ranking-table-heading" className="text-lg font-semibold text-ink">{activeSystem.label}</h2>
              <p className="mt-1 text-xs text-ink/42">
                {activeRank === "all" ? "按四套榜单数值的算术平均排序，仅作快速浏览参考。" : `按 ${activeSystem.shortLabel} 名次数值升序排列。`}
              </p>
            </div>
            <div className="text-xs text-ink/38">显示 {visibleRecords.length} / {records.length} 所</div>
          </div>

          <div className="mt-4 overflow-x-auto border-y border-line/60 bg-white/38">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-panel/95 text-[11px] font-medium text-ink/38">
                <tr>
                  <th className="w-20 px-3 py-3 text-center">排序</th>
                  <th className="min-w-72 px-3 py-3">大学与优势学科</th>
                  {RANK_KEYS.map((key) => (
                    <th key={key} className={"w-28 px-3 py-3 text-center " + (activeRank === key ? "bg-cobalt/6 text-cobalt" : "")}>
                      {KEY_LABELS[key]}
                    </th>
                  ))}
                  <th className="w-32 px-3 py-3 text-center">加入对比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/35">
                {visibleRecords.map((record, index) => {
                  const selected = selectedIds.includes(record.id);
                  const disabled = !selected && selectedIds.length >= 4;
                  const mainRank = Math.round(sortValue(record, activeRank));
                  const subjects = subjectsFrom(record.description);
                  return (
                    <tr key={record.id} className="transition hover:bg-white/80">
                      <td className="px-3 py-4 text-center">
                        <span className={"inline-flex min-w-10 items-center justify-center rounded-md px-2 py-1 text-xs font-bold " + rankTone(mainRank)}>
                          {activeRank === "all" ? mainRank : displayRank(record, activeRank)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <h3 className="text-sm font-semibold text-ink">{record.chineseName}</h3>
                              <span className="text-[10px] text-ink/34" lang="en">{englishNameFor(record)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-ink/40">
                              <MapPin size={11} /> {locationFrom(record.description)}
                            </div>
                            {subjects.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                {subjects.map((subject) => <span key={subject} className="text-[10px] text-ink/42">{subject}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {RANK_KEYS.map((key) => (
                        <td key={key} className={"px-3 py-4 text-center text-sm " + (activeRank === key ? "bg-cobalt/[0.035]" : "")}>
                          <RankValue record={record} rankKey={key} active={activeRank === key} />
                        </td>
                      ))}
                      <td className="px-3 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelected(record.id)}
                          disabled={disabled}
                          className={
                            "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 " +
                            (selected
                              ? "border-jade bg-jade text-white"
                              : "border-line/70 bg-panel text-ink/58 hover:border-ink/30 hover:text-ink")
                          }
                        >
                          {selected ? <Check size={13} /> : <Sparkles size={13} />}
                          {selected ? "已选择" : "对比"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleRecords.length === 0 && (
            <div className="border-b border-line/60 py-16 text-center">
              <Search className="mx-auto text-ink/18" size={24} />
              <p className="mt-3 text-sm text-ink/42">没有找到符合条件的大学</p>
              <button
                type="button"
                onClick={() => { setSearch(""); setRangeFilter("all"); }}
                className="mt-3 text-xs font-semibold text-cobalt hover:underline"
              >
                清除筛选
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="border-t border-line/60 bg-ink text-panel">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold"><Info size={16} /> 如何理解这张表</div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-panel/62">
              不同排名使用的评价口径并不相同。QS 更强调声誉与国际化，ARWU 更偏科研成果，THE 与 U.S. News 也有各自的研究和教学权重。名次适合帮助你发现差异，不应单独替代专业、预算、城市和录取风险判断。
            </p>
          </div>
          <div className="border-t border-panel/15 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div className="text-xs font-semibold text-panel/78">数据口径</div>
            <p className="mt-2 text-xs leading-6 text-panel/48">
              当前接入仓库已有的 37 所院校排名数据。区间排名按区间起点参与排序，并在表内标注“区间”；四榜参考均值不是任何机构发布的官方综合名次。
            </p>
            <Link href="/map" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-panel transition hover:text-white">
              回到地图继续看城市与成本 <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
