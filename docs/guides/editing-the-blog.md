# Editing the blog

How to write, translate and publish blog posts in the Studio, with no developer needed.
This guide is for editors. The technical side is in [CMS](./cms.md) and [Blog](./blog.md).

## 1. Before you start

- **Access.** A developer invites you to the Sanity project under **Members** with the
  **Editor** role, and you accept the email invite. Editors can write and publish, but
  cannot change the project's settings.
- **Where the Studio is.** Go to `https://<the site>/studio` and sign in with the account
  you were invited with. Until the site has its own domain (#45), a developer runs it
  for you at `http://localhost:3000/studio`.
- **Two sets of content.** The Studio has two datasets:
  - **production** is the live website;
  - **development** is a sandbox for testing.

  The dataset name shows in the top-left corner of the Studio. Write real posts only in
  **production**.

The Studio has three lists in the left column:

| List         | What it holds                                                        |
| ------------ | -------------------------------------------------------------------- |
| **Post**     | One document per language. EN and PT versions are linked.            |
| **Author**   | People who write posts: name, photo, role and bio in both languages. |
| **Category** | Topics such as Web Design or Branding, with a name in each language. |

A post needs an author and a category before you can publish it. Create those first if
they don't exist yet (sections 5 and 6).

## 2. Write a post

1. Open **Post** and click **+** (Create).
2. Choose **English Post** or **Português Post**. The language is fixed from this point;
   to make the other language, see section 4.
3. Fill in the fields, top to bottom:

| Field            | What to put there                                                                                                                                        | Limit             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **Title**        | The post's headline, as readers see it.                                                                                                                  | 120 characters    |
| **Slug**         | The post's web address: `/en/blog/<slug>`. Click **Generate** to make it from the title. **Don't change it after publishing**: shared links would break. | Required          |
| **Excerpt**      | One or two sentences. They appear on the blog cards, in search results and in link previews.                                                             | 220 characters    |
| **Cover image**  | The large picture at the top of the post. See section 3.                                                                                                 | Required, alt too |
| **Category**     | Pick one. It shows as the post's tag and decides which posts appear under "Keep reading".                                                                | Required          |
| **Author**       | Who wrote it. Their photo, name and bio show on the post.                                                                                                | Required          |
| **Published on** | Sets the order on the blog: newest first. The newest post is the big **featured** article at the top of the blog page.                                   | Required          |
| **Body**         | The article itself (below).                                                                                                                              | Required          |

### The body

The body editor offers only what the post design supports, so whatever you write always
looks right on the site.

- **Start with one plain paragraph that sums up the post.** The first paragraph is shown
  larger, as the introduction.
- **Heading** (the style menu) starts a main section. Every Heading is listed in the
  post's **"On this page"** menu, so keep headings short and clear. **Subheading** is for
  smaller divisions inside a section; it is not listed.
- **Quote** shows a large pull quote with a red bar. Words you make **bold** inside a quote
  turn red. For example, select "use them" in "They use them." and press Bold.
- **Bulleted lists** appear with red check marks. Use them for short points.
  **Numbered lists** stay numbered.
- **Bold** and **italic** for emphasis.
- **Links:** select the words, click the link button, and paste:
  - another website: the full address, starting `https://`;
  - a page on this site: the path, such as `/en/contact`;
  - an email address: `mailto:hello@example.com`.
- **Images:** see section 3. Each needs alternative text; a caption is optional.

There are no colours, font sizes or embedded videos to choose from, on purpose: the
design takes care of that.

### Search and sharing (optional)

The **SEO** tab at the top of a post has two fields:

- a **title**, up to 60 characters;
- a **description**, up to 160 characters.

They're used by Google and in link previews. Leave them empty and the post's title and
excerpt are used instead, which is usually fine.

## 3. Images and alternative text

- **Size.** Upload landscape photos at least **2400 px wide**, as JPG, PNG or WebP. The
  site makes the smaller versions itself.
- **Hotspot.** After uploading, click the crop icon and drag the circle onto the part of
  the picture that matters, such as a face. The same image is cropped differently in
  different places:
  - wide at the top of the post;
  - about 3:2 on the blog cards;
  - 1.9:1 in link previews.

  The hotspot keeps the subject in every crop.

- **Alternative text (required).** Describe what the picture shows for someone who can't
  see it, in the post's language. Sanity won't publish without it.
  - Good: "A designer sketching a logo on paper beside a laptop."
  - Not useful: "image", "cover", or the file name.
  - Keep it to one sentence, up to 160 characters, and don't start with "Image of".
- **Captions** (body images only) show under the picture. Use them for credits or context.

## 4. Translate a post

Each language version is its own document, so each one can have its own title, address
and wording.

1. Open the finished English post.
2. In the toolbar at the top of the document, click **Translations** and choose
   **Português**.
3. A Portuguese version opens. It starts as a **copy of the English text**, as a draft.
4. Translate every field:
   - title, excerpt and body;
   - the cover's alternative text, and the body images' alternative text and captions;
   - the SEO fields, if they were used.
5. **Give it its own slug:** click **Generate** again after translating the title. The
   copy starts with the English address.
6. **Publish** the Portuguese version. It is a separate document, so publishing the
   English one doesn't publish it.

The category and author are shared, so you don't need to change them. Their names and
bios already exist in both languages (sections 5 and 6).

**When a post has no translation:**

- Portuguese readers won't see it on the Portuguese blog.
- Someone reading the English post who switches to PT lands on the Portuguese blog page
  rather than an error.
- You can add the translation later; the two versions link up as soon as you create it
  from the **Translations** menu.

## 5. Categories

1. Open **Category** and click **+**.
2. Fill in the **Name** in both languages. For example "Branding" in English and "Marca"
   in Portuguese.
3. **Slug:** lowercase words joined by hyphens, such as `branding`. It appears in the
   blog's filter links (`?category=branding`), so set it once and leave it.
4. **Publish.**

The blog page lists each category as a filter chip in the visitor's language.

## 6. Authors

1. Open **Author** and click **+**.
2. Fill in:
   - **Name**;
   - **Photo**, with its alternative text (for example "Portrait of Ana Ribeiro");
   - **Role** and **Short bio**, each in English and Portuguese.
3. **Publish.**

The bio appears in the "Written by" card at the end of each post.

## 7. Publish, update and unpublish

- **Publish:** the green **Publish** button at the bottom right. If anything required is
  missing, the button lists what to fix, such as missing alternative text. A red mark
  shows next to the field.
- **What happens next:** Sanity tells the website that something changed (the
  "webhook"). Within about a minute the site updates everything that shows the post:
  - the blog page and its filters;
  - the post itself, and "Keep reading" on other posts;
  - the sitemap that Google reads.

  Nothing needs to be redeployed.

- **Drafts:** editing a published post creates a draft. The live site keeps the
  published version until you click **Publish** again.
- **Unpublish:** the **⋯** menu next to Publish → **Unpublish**. The post disappears from
  the site, and its address shows the "page not found" page. Its translation stays
  published unless you unpublish that too.
- **Delete:** first unpublish, then **⋯** → **Delete**. For a post with translations, use
  **Delete translation…** on the one you want to remove.

## 8. If something looks wrong

| What you see                                        | What to do                                                                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A change isn't on the site after 2 minutes          | Reload the page (Ctrl + Shift + R). If it's still old, ask a developer to check the webhook (runbook: [Environments](./environments.md) § 9).       |
| Publish is greyed out                               | A required field is empty. Look for the red marks; alternative text is the usual one.                                                               |
| The Portuguese post isn't linked to the English one | It was created with **+** instead of **Translations**. Delete the extra document and create it again from the English post's **Translations** menu. |
| The slug says it is already in use                  | Another post in the same language has that address. Change a word in it.                                                                            |
| A photo is cropped badly on the cards               | Move its **hotspot** (section 3).                                                                                                                   |

## 9. Launch checklist

The site launches with **3 posts in each language** (brief › Confirmed assumptions). For
each post:

- [ ] English version published: title, slug, excerpt, cover with alt text, category, author, date, body.
- [ ] The first paragraph is a summary, and every section starts with a Heading.
- [ ] Portuguese version created from **Translations**, every field translated, its own slug, published.
- [ ] Both versions open on the site, and the EN · PT switch moves between them.
- [ ] The categories and authors used have names, roles and bios in both languages.
