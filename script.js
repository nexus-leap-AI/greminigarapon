// ==========================================================================
// 【管理・編集用 設定エリア】 初心者の方はこちらを編集してください
// ==========================================================================
const CONFIG = {
    // 抽選が回る時間（ミリ秒単位 / 1000ms = 1秒）
    spinDuration: 3500, // 3.5秒

    // メッセージ文言の設定
    messages: {
        titleNew: "見事当選！",
        titleAlready: "本日の抽選は完了しています",
        staffNotice: "⚠️ スタッフにこの画面を見せてください"
    },

    // 等級ごとの設定（当選確率、名前、景品リスト）
    // ※ 確率(probability)の合計がちょうど100になるように設定してください。
    prizes: [
        {
            grade: "1等",
            probability: 5, // 5%の確率
            items: ["おもちゃA", "日用品A"]
        },
        {
            grade: "2等",
            probability: 15, // 15%の確率
            items: ["おもちゃB", "日用品B"]
        },
        {
            grade: "3等",
            probability: 30, // 30%の確率
            items: ["おもちゃC", "日用品C"]
        },
        {
            grade: "参加賞",
            probability: 50, // 50%の確率
            items: ["ポケットティッシュ", "お菓子"]
        }
    ]
};

// ==========================================================================
// アプリケーション ロジック (ここから下は原則変更不要です)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // HTML要素の取得
    const mainScreen = document.getElementById("main-screen");
    const spinButton = document.getElementById("spin-button");
    const garaponBody = document.getElementById("garapon-body");
    const resultPopup = document.getElementById("result-popup");
    const resultTitle = document.getElementById("result-title");
    const resultGrade = document.getElementById("result-grade");
    const resultItem = document.getElementById("result-item");
    const resultDate = document.getElementById("result-date");
    const confettiContainer = document.getElementById("confetti-container");

    // 今日の日付を取得 (フォーマット: YYYY-MM-DD)
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    };

    const todayStr = getTodayString();

    // URLからパラメータ「user」を取得
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get("user");

    // 【修正ポイント】パラメータがない場合、自動でゲストIDを発行
    if (!userId || userId.trim() === "") {
        // すでにブラウザ（セッション）用に発行済みのゲストIDがあるか確認
        let sessionGuestId = sessionStorage.getItem("garapon_guest_id");
        
        if (!sessionGuestId) {
            // なければ新規作成（例: guest_20260605_84920）
            const randomId = Math.floor(10000 + Math.random() * 90000); // 5桁のランダム数字
            const dateClean = todayStr.replace(/-/g, ""); // ハイフン無しの真面目な日付
            sessionGuestId = `guest_${dateClean}_${randomId}`;
            // タブを閉じるまでは同じIDを維持するように保持
            sessionStorage.setItem("garapon_guest_id", sessionGuestId);
        }
        
        userId = sessionGuestId;
    }

    // 必ずメイン画面を表示する（エラー画面は使わなくなります）
    mainScreen.classList.remove("hidden");

    // 1日1回制限のチェック
    const storageKey = `garapon_user_${userId}`;
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.date === todayStr) {
            // すでに今日抽選済みの場合は、過去の結果をポップアップ表示
            showResultPopup(parsedData.grade, parsedData.item, parsedData.formattedDate, true);
        }
    }

    // 抽選ボタンが押されたときの処理
    spinButton.addEventListener("click", () => {
        spinButton.disabled = true;
        garaponBody.classList.add("spinning");

        const lotteryResult = executeLottery();

        const now = new Date();
        const formattedDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const dataToSave = {
            date: todayStr,
            grade: lotteryResult.grade,
            item: lotteryResult.item,
            formattedDate: formattedDate
        };

        localStorage.setItem(storageKey, JSON.stringify(dataToSave));

        setTimeout(() => {
            garaponBody.classList.remove("spinning");
            showResultPopup(lotteryResult.grade, lotteryResult.item, formattedDate, false);
        }, CONFIG.spinDuration);
    });

    // 抽選ロジック本体
    function executeLottery() {
        const randomNum = Math.floor(Math.random() * 100);
        let currentRange = 0;
        let selectedPrize = null;

        for (const prize of CONFIG.prizes) {
            currentRange += prize.probability;
            if (randomNum < currentRange) {
                selectedPrize = prize;
                break;
            }
        }

        if (!selectedPrize) {
            selectedPrize = CONFIG.prizes[CONFIG.prizes.length - 1];
        }

        const items = selectedPrize.items;
        const randomItemIndex = Math.floor(Math.random() * items.length);
        const selectedItem = items[randomItemIndex];

        return {
            grade: selectedPrize.grade,
            item: selectedItem
        };
    }

    // 結果ポップアップ表示処理
    function showResultPopup(grade, item, dateText, isAlreadyPlayed) {
        if (isAlreadyPlayed) {
            resultTitle.textContent = CONFIG.messages.titleAlready;
            spinButton.disabled = true;
        } else {
            resultTitle.textContent = CONFIG.messages.titleNew;
            startConfetti();
        }

        resultGrade.textContent = grade;
        resultItem.textContent = item;
        resultDate.textContent = `確認日時：${dateText}`;
        resultPopup.classList.remove("hidden");
    }

    // 紙吹雪の演出エフェクト
    function startConfetti() {
        const colors = ['#ffeb3b', '#ff5722', '#e91e63', '#00bcd4', '#4caf50', '#ffffff'];
        const confettiCount = 80;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement("div");
            confetti.classList.add("confetti");
            
            confetti.style.left = Math.random() * 100 + "vw";
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + "s";
            confetti.style.animationDuration = (Math.random() * 2 + 2) + "s";
            
            confetti.style.width = (Math.random() * 8 + 6) + "px";
            confetti.style.height = (Math.random() * 8 + 6) + "px";

            confettiContainer.appendChild(confetti);
        }
    }
});