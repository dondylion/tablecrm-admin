"use client";

import { useEffect, useMemo, useState } from "react";

type CashbackType = "lcard_cashback" | "percent" | "fixed" | "const" | "no_cashback";

type ProductFormValues = {
  name: string;
  type: "product";
  description_short: string;
  description_long: string;
  code: string;
  unit: string;
  category: string;
  cashback_type: CashbackType;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  global_category_id: string;
  marketplace_price: string;
  chatting_percent: string;
  address: string;
  latitude: string;
  longitude: string;
};

type FieldErrors = Partial<Record<keyof ProductFormValues, string>>;

const DRAFT_KEY = "tablecrm-product-draft";
const TABLECRM_ENDPOINT =
  "https://app.tablecrm.com/api/v1/nomenclature/?token=af1874616430e04cfd4bce30035789907e899fc7c3a1a4bb27254828ff304a77";

const initialValues: ProductFormValues = {
  name: "",
  type: "product",
  description_short: "",
  description_long: "",
  code: "",
  unit: "116",
  category: "2477",
  cashback_type: "lcard_cashback",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  global_category_id: "",
  marketplace_price: "",
  chatting_percent: "",
  address: "",
  latitude: "",
  longitude: "",
};

const cashbackOptions: Array<{ label: string; value: CashbackType }> = [
  { label: "Кешбэк LCard", value: "lcard_cashback" },
  { label: "Процентный кешбэк", value: "percent" },
  { label: "Фиксированный кешбэк", value: "fixed" },
];

function parseNumber(value: string) {
  if (value.trim() === "") {
    return undefined;
  }

  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : undefined;
}

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCashbackType(value: CashbackType): Exclude<CashbackType, "fixed"> {
  if (value === "fixed") {
    return "const";
  }
  return value;
}

function isCategoryNotFoundError(message?: string) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("categorie") && normalized.includes("не существует");
}

type AiGeneratedFields = {
  description_short: string;
  description_long: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
};

function parseAiJson(text: string): AiGeneratedFields | null {
  const candidates: string[] = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.push(fenced[1]);
  }
  const objectLike = text.match(/\{[\s\S]*\}/);
  if (objectLike?.[0]) {
    candidates.push(objectLike[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<AiGeneratedFields>;
      const keywords = Array.isArray(parsed.seo_keywords)
        ? parsed.seo_keywords.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
        : [];
      if (
        typeof parsed.description_short === "string" &&
        typeof parsed.description_long === "string" &&
        typeof parsed.seo_title === "string" &&
        typeof parsed.seo_description === "string"
      ) {
        return {
          description_short: parsed.description_short.trim(),
          description_long: parsed.description_long.trim(),
          seo_title: parsed.seo_title.trim(),
          seo_description: parsed.seo_description.trim(),
          seo_keywords: keywords,
        };
      }
    } catch {
      // ignore malformed candidates
    }
  }

  return null;
}

function validate(values: ProductFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Укажите название товара";
  }

  if (!values.code.trim()) {
    errors.code = "Укажите артикул";
  }

  if (!values.unit.trim() || parseNumber(values.unit) === undefined) {
    errors.unit = "Единица измерения должна быть числом";
  }

  if (!values.category.trim() || parseNumber(values.category) === undefined) {
    errors.category = "Категория должна быть числом";
  }

  if (values.marketplace_price.trim()) {
    const price = parseNumber(values.marketplace_price);
    if (price === undefined || price < 0) {
      errors.marketplace_price = "Цена должна быть положительным числом";
    }
  }

  if (values.chatting_percent.trim()) {
    const percent = parseNumber(values.chatting_percent);
    if (percent === undefined || percent < 0 || percent > 100) {
      errors.chatting_percent = "Процент должен быть в диапазоне 0-100";
    }
  }

  if (values.latitude.trim() && parseNumber(values.latitude) === undefined) {
    errors.latitude = "Широта должна быть числом";
  }

  if (values.longitude.trim() && parseNumber(values.longitude) === undefined) {
    errors.longitude = "Долгота должна быть числом";
  }

  return errors;
}

function buildPayload(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    type: values.type,
    description_short: values.description_short.trim(),
    description_long: values.description_long.trim(),
    code: values.code.trim(),
    unit: parseNumber(values.unit),
    category: parseNumber(values.category),
    cashback_type: normalizeCashbackType(values.cashback_type),
    seo_title: values.seo_title.trim(),
    seo_description: values.seo_description.trim(),
    seo_keywords: parseKeywords(values.seo_keywords),
    global_category_id: parseNumber(values.global_category_id),
    marketplace_price: parseNumber(values.marketplace_price),
    chatting_percent: parseNumber(values.chatting_percent),
    address: values.address.trim(),
    latitude: parseNumber(values.latitude),
    longitude: parseNumber(values.longitude),
  };
}

function FieldLabel({ title, required }: { title: string; required?: boolean }) {
  return (
    <label className="mb-2 block text-sm font-medium text-foreground">
      {title}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export default function ProductCreateForm() {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [serverMessage, setServerMessage] = useState<string>("");
  const [serverError, setServerError] = useState<string>("");

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(DRAFT_KEY);

    if (!savedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as Partial<ProductFormValues>;
      setValues((prev) => ({ ...prev, ...parsed }));
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  }, [values]);

  const payload = useMemo(() => buildPayload(values), [values]);

  const onFieldChange = (key: keyof ProductFormValues, nextValue: string) => {
    setValues((prev) => ({ ...prev, [key]: nextValue }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const clearDraft = () => {
    window.localStorage.removeItem(DRAFT_KEY);
    setValues(initialValues);
    setErrors({});
    setServerError("");
    setServerMessage("Черновик очищен");
  };

  const onGenerateAi = async () => {
    const productName = values.name.trim();
    if (!productName) {
      setErrors((prev) => ({ ...prev, name: "Введите название товара для AI-генерации" }));
      return;
    }

    setServerError("");
    setServerMessage("");
    setIsGeneratingAi(true);

    try {
      const prompt = [
        "Ты маркетолог e-commerce. Верни только JSON без markdown и пояснений.",
        `Название товара: ${productName}.`,
        "Сгенерируй поля:",
        '- description_short (1-2 предложения, до 180 символов)',
        "- description_long (4-6 предложений с выгодами товара)",
        "- seo_title (до 70 символов)",
        "- seo_description (до 160 символов)",
        "- seo_keywords (массив из 8-12 ключевых фраз на русском)",
      ].join("\n");

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const body = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Не удалось получить ответ от AI");
      }

      const generated = parseAiJson(body.text ?? "");
      if (!generated) {
        throw new Error("AI вернул ответ в неожиданном формате");
      }

      setValues((prev) => ({
        ...prev,
        description_short: generated.description_short || prev.description_short,
        description_long: generated.description_long || prev.description_long,
        seo_title: generated.seo_title || prev.seo_title,
        seo_description: generated.seo_description || prev.seo_description,
        seo_keywords: generated.seo_keywords.length > 0 ? generated.seo_keywords.join(", ") : prev.seo_keywords,
      }));
      setErrors((prev) => ({
        ...prev,
        description_short: undefined,
        description_long: undefined,
        seo_title: undefined,
        seo_description: undefined,
        seo_keywords: undefined,
      }));
      setServerMessage("AI заполнил описания и SEO-поля");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Ошибка AI-генерации");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");
    setServerMessage("");

    const currentErrors = validate(values);
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
      setServerError("Исправьте ошибки формы перед отправкой");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(TABLECRM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([payload]),
      });

      const responseBody = (await response.json()) as {
        detail?: string;
        error?: string;
      };

      if (!response.ok) {
        const rawMessage = responseBody?.detail ?? responseBody?.error;

        if (isCategoryNotFoundError(rawMessage)) {
          setErrors((prev) => ({
            ...prev,
            category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u0441 \u0442\u0430\u043a\u0438\u043c ID \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430",
          }));
          throw new Error(
            "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u0441 \u0443\u043a\u0430\u0437\u0430\u043d\u043d\u044b\u043c ID \u043d\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u043b\u0435 \u00abID \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438\u00bb."
          );
        }

        throw new Error(rawMessage ?? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443");
      }

      setServerMessage("Карточка успешно отправлена в TableCRM");
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка отправки";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const seoKeywordsCount = parseKeywords(values.seo_keywords).length;

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Основная информация</h2>
          <p className="mt-1 text-sm text-muted-foreground">Эти данные увидит покупатель в карточке товара.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel title="Название" required />
              <input
                value={values.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Например: Кофемашина Barista Pro"
              />
              {values.name.trim() ? (
                <button
                  type="button"
                  onClick={onGenerateAi}
                  disabled={isGeneratingAi || isSubmitting}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 animate-pulse disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingAi ? "AI генерирует..." : "Сгененрировать описания с помощью AI"}
                </button>
              ) : null}
              <FieldError message={errors.name} />
            </div>

            <div>
              <FieldLabel title="Артикул" required />
              <input
                value={values.code}
                onChange={(event) => onFieldChange("code", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="SKU-001"
              />
              <FieldError message={errors.code} />
            </div>

            <div>
              <FieldLabel title="Тип" />
              <input
                value={values.type}
                disabled
                className="h-10 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground"
              />
            </div>

            <div>
              <FieldLabel title="ID единицы измерения" required />
              <input
                value={values.unit}
                onChange={(event) => onFieldChange("unit", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="116"
              />
              <FieldError message={errors.unit} />
            </div>

            <div>
              <FieldLabel title="ID категории" required />
              <input
                value={values.category}
                onChange={(event) => onFieldChange("category", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="2477"
              />
              <FieldError message={errors.category} />
            </div>

            <div>
              <FieldLabel title="Тип кешбэка" />
              <select
                value={values.cashback_type}
                onChange={(event) => onFieldChange("cashback_type", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              >
                {cashbackOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel title="Глобальная категория" />
              <input
                value={values.global_category_id}
                onChange={(event) => onFieldChange("global_category_id", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="127"
              />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel title="Краткое описание" />
              <textarea
                value={values.description_short}
                onChange={(event) => onFieldChange("description_short", event.target.value)}
                className="min-h-22 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="2-3 предложения о товаре"
              />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel title="Полное описание" />
              <textarea
                value={values.description_long}
                onChange={(event) => onFieldChange("description_long", event.target.value)}
                className="min-h-30 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Подробное описание, преимущества, состав, условия использования"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Цена и коммуникации</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel title="Цена маркетплейса" />
              <input
                value={values.marketplace_price}
                onChange={(event) => onFieldChange("marketplace_price", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="500"
              />
              <FieldError message={errors.marketplace_price} />
            </div>

            <div>
              <FieldLabel title="Процент чата" />
              <input
                value={values.chatting_percent}
                onChange={(event) => onFieldChange("chatting_percent", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="4"
              />
              <FieldError message={errors.chatting_percent} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">SEO</h2>
          <div className="mt-5 grid gap-4">
            <div>
              <FieldLabel title="SEO title" />
              <input
                value={values.seo_title}
                onChange={(event) => onFieldChange("seo_title", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <FieldLabel title="SEO description" />
              <textarea
                value={values.seo_description}
                onChange={(event) => onFieldChange("seo_description", event.target.value)}
                className="min-h-22 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel title="SEO keywords" />
                <span className="text-xs text-muted-foreground">{seoKeywordsCount} ключей</span>
              </div>
              <input
                value={values.seo_keywords}
                onChange={(event) => onFieldChange("seo_keywords", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="SEO, Ключи"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Локация</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel title="Адрес" />
              <input
                value={values.address}
                onChange={(event) => onFieldChange("address", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="улица Зайцева 8, Казань"
              />
            </div>

            <div>
              <FieldLabel title="Широта" />
              <input
                value={values.latitude}
                onChange={(event) => onFieldChange("latitude", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="55.7711953"
              />
              <FieldError message={errors.latitude} />
            </div>

            <div>
              <FieldLabel title="Долгота" />
              <input
                value={values.longitude}
                onChange={(event) => onFieldChange("longitude", event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="49.10211795"
              />
              <FieldError message={errors.longitude} />
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold">Действия</h3>
          <p className="mt-1 text-sm text-muted-foreground">Черновик сохраняется автоматически в браузере.</p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Отправка..." : "Создать карточку"}
            </button>
            <button
              type="button"
              onClick={clearDraft}
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition hover:bg-muted"
            >
              Очистить черновик
            </button>
          </div>

          {serverMessage ? (
            <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {serverMessage}
            </p>
          ) : null}
          {serverError ? (
            <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          ) : null}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">JSON предпросмотр</h3>
          <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-3 text-xs leading-5">
            {JSON.stringify([payload], null, 2)}
          </pre>
        </section>
      </aside>
    </form>
  );
}


