import json
import re
import pdfplumber

source = "/Users/panda/Downloads/NPTEL_Combined.pdf"
with pdfplumber.open(source) as pdf:
    text = "\n".join(page.extract_text() or "" for page in pdf.pages)

assignments = []
for block in re.split(r"(?=Assignment\s+\d+\s*$)", text, flags=re.M):
    heading = re.match(r"Assignment\s+(\d+)", block)
    if not heading:
        continue
    number = int(heading.group(1))
    entries = re.split(r"(?m)(?=^\d+\.\s)", block)[1:]
    questions = []
    for entry in entries:
        qmatch = re.match(r"(\d+)\.\s*(.*)", entry, re.S)
        if not qmatch:
            continue
        qnum = int(qmatch.group(1))
        body = qmatch.group(2)
        amatch = re.search(r"(?m)^\s*(?:[a-e]\.\s*)?Answer:\s*", body)
        if not amatch:
            continue
        question_and_options = body[:amatch.start()].strip()
        answer_text = body[amatch.end():].strip()
        option_matches = list(re.finditer(r"(?m)^\s*([a-e])\.\s*", question_and_options))
        if not option_matches:
            continue
        prompt = question_and_options[:option_matches[0].start()].strip()
        options = []
        for i, match in enumerate(option_matches):
            end = option_matches[i + 1].start() if i + 1 < len(option_matches) else len(question_and_options)
            option_text = question_and_options[match.end():end].strip()
            options.append({"id": match.group(1), "text": re.sub(r"\s+", " ", option_text)})

        answers = []
        # Answer keys may list multiple correct options on separate lines.
        for line in re.split(r"\n+", answer_text):
            line = re.sub(r"^\s*[a-e]\.\s*", "", line.strip())
            line = re.sub(r"^Answer:\s*", "", line, flags=re.I).strip()
            if line:
                answers.append(re.sub(r"\s+", " ", line).rstrip("."))

        def norm(value):
            return re.sub(r"[^a-z0-9]+", "", value.lower())

        correct = []
        for answer in answers:
            hit = next((opt["id"] for opt in options if norm(opt["text"]) == norm(answer) or norm(answer) in norm(opt["text"])), None)
            if hit and hit not in correct:
                correct.append(hit)
        if not correct:
            # Some answer keys repeat option labels or differ only in punctuation.
            for answer in answers:
                hit = next((opt["id"] for opt in options if norm(opt["text"]) in norm(answer) or norm(answer) in norm(opt["text"])), None)
                if hit and hit not in correct:
                    correct.append(hit)
        if not correct and number == 3 and qnum == 8:
            correct = ["b"]  # Answer key says "Define" while option says "Defining".
        if not correct:
            print(f"Could not map answer: Assignment {number} Q{qnum}: {answers}")
            continue
        questions.append({"id": f"a{number}-q{qnum}", "prompt": re.sub(r"\s+", " ", prompt), "options": options, "correct": correct})
    assignments.append({"week": number, "title": f"Week {number}", "questions": questions})

with open("src/questions.json", "w") as output:
    json.dump(assignments, output, ensure_ascii=False, indent=2)
print("assignments", len(assignments), "questions", sum(len(a["questions"]) for a in assignments), "multi", sum(len(q["correct"]) > 1 for a in assignments for q in a["questions"]))
