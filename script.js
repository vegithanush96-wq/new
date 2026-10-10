// ---------- 1. Get elements ----------
const $ = function (id) { return document.getElementById(id); };

// Colours and emoji for each category
const colors = { Food: "#f59e0b", Travel: "#06b6d4", Shopping: "#ec4899", Bills: "#6366f1", Education: "#14b8a6", Salary: "#16a34a", Other: "#94a3b8" };
const icons  = { Food: "🍔", Travel: "✈️", Shopping: "🛍️", Bills: "💡", Education: "🎓", Salary: "💼", Other: "📦" };

// ---------- 2. Load saved data ----------
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let budget = Number(localStorage.getItem("budget")) || 0;
let goal = JSON.parse(localStorage.getItem("goal")) || null;

// Default: show the current month and today's date in the form
const today = new Date().toISOString().slice(0, 10);
$("date").value = today;
$("monthFilter").value = today.slice(0, 7);

// ---------- 3. Add transaction ----------
function addTransaction() {
  const title = $("title").value.trim();
  const amount = Number($("amount").value);

  if (title === "" || amount <= 0 || $("date").value === "") {
    $("error").textContent = "Enter a title, an amount above 0 and a date.";
    return;
  }
  $("error").textContent = "";

  transactions.push({
    id: Date.now(),
    title: title,
    amount: amount,
    type: $("type").value,
    category: $("category").value,
    date: $("date").value
  });

  saveData();
  showData();
  $("title").value = "";
  $("amount").value = "";
}

function deleteTransaction(id) {
  transactions = transactions.filter(function (t) { return t.id !== id; });
  saveData();
  showData();
}

// ---------- 4. Budget and goal ----------
function saveBudget() {
  budget = Number($("budgetInput").value);
  localStorage.setItem("budget", budget);
  $("budgetInput").value = "";
  showData();
}

function saveGoal() {
  const name = $("goalName").value.trim();
  const target = Number($("goalTarget").value);
  if (name === "" || target <= 0) return;
  goal = { name: name, target: target };
  localStorage.setItem("goal", JSON.stringify(goal));
  $("goalName").value = "";
  $("goalTarget").value = "";
  showData();
}

function saveData() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// ---------- 5. Filtering ----------
// Month filter is used for the summary, budget and breakdown.
function inMonth() {
  const month = $("monthFilter").value;   // "2026-10" or ""
  return transactions.filter(function (t) {
    return month === "" || t.date.startsWith(month);
  });
}

// ---------- 6. Show everything ----------
function showData() {
  const monthData = inMonth();
  let income = 0;
  let expense = 0;
  const byCategory = {};

  monthData.forEach(function (t) {
    if (t.type === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    }
  });

  // Summary cards
  $("income").textContent = "₹" + income;
  $("expense").textContent = "₹" + expense;
  $("balance").textContent = "₹" + (income - expense);
  const rate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  $("rate").textContent = rate + "%";
  $("count").textContent = monthData.length;

  showBudget(expense);
  showGoal();
  showBreakdown(byCategory, expense);
  showHealth(income, expense, monthData.length);
  showInsights(monthData, byCategory, expense);
  showTrend();
  showList(monthData);
}

function showBudget(expense) {
  const fill = $("budgetFill");
  if (budget <= 0) {
    fill.style.width = "0%";
    $("budgetText").textContent = "No budget set.";
    return;
  }
  const percent = Math.min(100, Math.round((expense / budget) * 100));
  fill.style.width = percent + "%";
  fill.className = "fill" + (expense > budget ? " over" : percent >= 80 ? " warn" : "");

  if (expense > budget) {
    $("budgetText").textContent = "Over budget by ₹" + (expense - budget) + " (budget ₹" + budget + ")";
  } else {
    $("budgetText").textContent = "Spent ₹" + expense + " of ₹" + budget + ". ₹" + (budget - expense) + " left.";
  }
}

function showGoal() {
  if (goal === null) {
    $("goalFill").style.width = "0%";
    $("goalText").textContent = "No goal set.";
    return;
  }
  // Savings = all income minus all expenses (all time)
  let saved = 0;
  transactions.forEach(function (t) {
    saved += t.type === "income" ? t.amount : -t.amount;
  });
  saved = Math.max(0, saved);
  const percent = Math.min(100, Math.round((saved / goal.target) * 100));
  $("goalFill").style.width = percent + "%";
  $("goalText").textContent = goal.name + ": ₹" + saved + " of ₹" + goal.target + " (" + percent + "%)";
}

function showBreakdown(byCategory, expense) {
  const box = $("breakdown");
  box.innerHTML = "";
  const names = Object.keys(byCategory);

  if (names.length === 0) {
    box.innerHTML = '<p class="empty">No expenses for this period.</p>';
    return;
  }

  // Build the donut: conic-gradient needs "colour start% end%" pieces
  let pieces = [];
  let start = 0;
  let legend = "";
  names.forEach(function (name) {
    const percent = (byCategory[name] / expense) * 100;
    pieces.push(colors[name] + " " + start + "% " + (start + percent) + "%");
    start += percent;
    legend += '<div class="leg"><span class="dot" style="background:' + colors[name] + '"></span>' +
              '<span>' + icons[name] + ' ' + name + '</span><b>' + Math.round(percent) + '%</b></div>';
  });

  box.innerHTML =
    '<div class="donut-wrap">' +
      '<div class="donut" style="background: conic-gradient(' + pieces.join(",") + ')">' +
        '<div class="donut-hole"><b>₹' + expense + '</b><span>spent</span></div>' +
      '</div>' +
      '<div class="legend">' + legend + '</div>' +
    '</div>';
}

function showList(monthData) {
  const text = $("search").value.toLowerCase();
  const cat = $("catFilter").value;

  const shown = monthData
    .filter(function (t) {
      return t.title.toLowerCase().includes(text) && (cat === "" || t.category === cat);
    })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });   // newest first

  $("list").innerHTML = "";
  if (shown.length === 0) {
    $("list").innerHTML = '<p class="empty">No transactions found.</p>';
    return;
  }

  shown.forEach(function (t) {
    const li = document.createElement("li");
    li.className = t.type;

    const left = document.createElement("div");
    left.className = "l";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = icons[t.category];
    badge.style.background = colors[t.category] + "33";
    const words = document.createElement("span");
    words.textContent = t.title;                      // textContent is safe
    const info = document.createElement("small");
    info.textContent = t.category + " • " + t.date;
    words.appendChild(info);
    left.appendChild(badge);
    left.appendChild(words);

    const right = document.createElement("span");
    const amt = document.createElement("span");
    amt.className = "amt";
    amt.textContent = (t.type === "income" ? "+" : "-") + "₹" + t.amount;
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "Delete";
    del.addEventListener("click", function () { deleteTransaction(t.id); });
    right.appendChild(amt);
    right.appendChild(del);

    li.appendChild(left);
    li.appendChild(right);
    $("list").appendChild(li);
  });
}

// ---------- UNIQUE FEATURE 1: Financial health score (out of 100) ----------
function getSaved() {
  let saved = 0;
  transactions.forEach(function (t) {
    saved += t.type === "income" ? t.amount : -t.amount;
  });
  return Math.max(0, saved);
}

function showHealth(income, expense, count) {
  if (count === 0) {
    $("ring").style.background = "#e2e8f0";
    $("score").textContent = "0";
    $("grade").textContent = "No data";
    $("scoreTip").textContent = "Add transactions to see your score.";
    return;
  }

  let score = 10;                                   // 10 points for tracking your money

  // Savings rate: up to 40 points (30% saved = full marks)
  if (income > 0) {
    const rate = Math.max(0, (income - expense) / income);
    score += Math.min(40, Math.round((rate / 0.3) * 40));
  }

  // Budget: up to 30 points
  let tip = "Keep going, you are doing fine.";
  if (budget > 0) {
    if (expense <= budget * 0.8) score += 30;
    else if (expense <= budget) { score += 20; tip = "You are close to your budget limit."; }
    else tip = "You crossed your budget. Cut spending next week.";
  } else {
    score += 15;
    tip = "Set a monthly budget to earn more points.";
  }

  // Goal: up to 20 points
  if (goal !== null) {
    score += Math.round(Math.min(1, getSaved() / goal.target) * 20);
  } else {
    score += 10;
  }

  score = Math.min(100, score);
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#e11d48";
  const grade = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs work";

  $("ring").style.background = "conic-gradient(" + color + " " + score + "%, #e2e8f0 0)";
  $("score").textContent = score;
  $("grade").textContent = grade;
  $("scoreTip").textContent = tip;
}

// ---------- UNIQUE FEATURE 2: Smart insights + month-end forecast ----------
function showInsights(monthData, byCategory, expense) {
  const month = $("monthFilter").value;
  const rows = [];

  // Top category
  let top = "-";
  let topAmount = 0;
  Object.keys(byCategory).forEach(function (name) {
    if (byCategory[name] > topAmount) { topAmount = byCategory[name]; top = name; }
  });
  rows.push(["🏷️", "Top category", top === "-" ? "-" : icons[top] + " " + top]);

  // Biggest single expense
  let biggest = null;
  monthData.forEach(function (t) {
    if (t.type === "expense" && (biggest === null || t.amount > biggest.amount)) biggest = t;
  });
  rows.push(["💥", "Biggest expense", biggest ? biggest.title + " (₹" + biggest.amount + ")" : "-"]);

  // Days passed in the selected month
  if (month !== "") {
    const year = Number(month.slice(0, 4));
    const mon = Number(month.slice(5, 7));
    const daysInMonth = new Date(year, mon, 0).getDate();
    const isNow = month === today.slice(0, 7);
    const daysPassed = isNow ? Number(today.slice(8, 10)) : daysInMonth;

    const perDay = Math.round(expense / daysPassed);
    rows.push(["📆", "Average per day", "₹" + perDay]);

    // Days with no expense at all
    const spendDays = [];
    monthData.forEach(function (t) {
      if (t.type === "expense" && !spendDays.includes(t.date)) spendDays.push(t.date);
    });
    rows.push(["🌿", "No-spend days", Math.max(0, daysPassed - spendDays.length)]);

    // Forecast: current pace x total days in month
    if (isNow) {
      rows.push(["🔮", "Forecast for month end", "₹" + Math.round(perDay * daysInMonth)]);
    }
  } else {
    rows.push(["📆", "Tip", "Pick a month to see daily average and forecast."]);
  }

  $("insights").innerHTML = "";
  rows.forEach(function (r) {
    const li = document.createElement("li");
    li.innerHTML = "<span>" + r[0] + "</span><span class='k'></span><b></b>";
    li.querySelector(".k").textContent = r[1];
    li.querySelector("b").textContent = r[2];
    $("insights").appendChild(li);
  });
}

// ---------- UNIQUE FEATURE 3: 6-month income vs expense trend ----------
function showTrend() {
  const now = new Date();
  const months = [];
  let biggest = 1;

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    let inc = 0;
    let exp = 0;
    transactions.forEach(function (t) {
      if (t.date.startsWith(key)) {
        if (t.type === "income") inc += t.amount; else exp += t.amount;
      }
    });
    biggest = Math.max(biggest, inc, exp);
    months.push({ label: d.toLocaleString("en", { month: "short" }), inc: inc, exp: exp });
  }

  $("trend").innerHTML = "";
  months.forEach(function (m) {
    const col = document.createElement("div");
    col.className = "tm";
    col.innerHTML =
      "<div class='bars'>" +
        "<div class='b in' style='height:" + (m.inc / biggest) * 100 + "%' title='Income ₹" + m.inc + "'></div>" +
        "<div class='b out' style='height:" + (m.exp / biggest) * 100 + "%' title='Expense ₹" + m.exp + "'></div>" +
      "</div><small>" + m.label + "</small>";
    $("trend").appendChild(col);
  });
}

// ---------- 7. Download CSV (opens in Excel) ----------
function downloadCSV() {
  let csv = "Date,Title,Category,Type,Amount\n";
  transactions.forEach(function (t) {
    csv += t.date + "," + t.title.replace(/,/g, " ") + "," + t.category + "," + t.type + "," + t.amount + "\n";
  });
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  link.download = "transactions.csv";
  link.click();
}

function clearAll() {
  if (confirm("Delete all transactions? This cannot be undone.")) {
    transactions = [];
    saveData();
    showData();
  }
}

// ---------- 8. Connect buttons ----------
$("addBtn").addEventListener("click", addTransaction);
$("budgetBtn").addEventListener("click", saveBudget);
$("goalBtn").addEventListener("click", saveGoal);
$("csvBtn").addEventListener("click", downloadCSV);
$("clearBtn").addEventListener("click", clearAll);
$("allBtn").addEventListener("click", function () { $("monthFilter").value = ""; showData(); });
$("monthFilter").addEventListener("change", showData);
$("search").addEventListener("input", showData);
$("catFilter").addEventListener("change", showData);

showData();
