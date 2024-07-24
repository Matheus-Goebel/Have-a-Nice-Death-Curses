let currentCardBox = 0;
let currentCopiedBox = 0;
let copiedBoxes = document.querySelectorAll('.copied-box');
const cardBoxes = document.querySelectorAll('.card-box');
let copiedImagesMap = {};
let isCopying = false;

function showBox(boxes, index) {
    boxes.forEach((box, i) => {
        box.classList.toggle('active', i === index);
    });
}

function prevCardBox() {
    currentCardBox = (currentCardBox > 0) ? currentCardBox - 1 : cardBoxes.length - 1;
    showBox(cardBoxes, currentCardBox);
}

function nextCardBox() {
    currentCardBox = (currentCardBox < cardBoxes.length - 1) ? currentCardBox + 1 : 0;
    showBox(cardBoxes, currentCardBox);
}

function prevCopiedBox() {
    currentCopiedBox = (currentCopiedBox > 0) ? currentCopiedBox - 1 : copiedBoxes.length - 1;
    showBox(copiedBoxes, currentCopiedBox);
}

function nextCopiedBox() {
    currentCopiedBox = (currentCopiedBox < copiedBoxes.length - 1) ? currentCopiedBox + 1 : 0;
    showBox(copiedBoxes, currentCopiedBox);
}

showBox(cardBoxes, currentCardBox);
showBox(copiedBoxes, currentCopiedBox);

document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.card-box img');
    images.forEach(img => {
        img.addEventListener('click', function() {
            toggleImageSelection(img);
        });
    });

    function toggleImageSelection(img) {
        const src = img.src;
        if (img.style.opacity === '0.5' && !isCopying) {
            img.style.opacity = '1.0';
            removeCopiedImage(src, img);
        } else {
            if (!isCopying) {
                img.style.opacity = '0.5';
                copyImage(img);
            }
        }
    }

    function copyImage(img) {
        isCopying = true;
        const src = img.src;
        const originalBoxShadow = getComputedStyle(img).boxShadow;

        if (!copiedImagesMap[src]) {
            const copiedImg = img.cloneNode();
            copiedImg.style.opacity = '1.0';
            copiedImg.setAttribute('data-box-shadow', originalBoxShadow);
            copiedImg.style.boxShadow = originalBoxShadow;
            copiedImagesMap[src] = copiedImg;

            let targetContainer = null;

            let existingBoxWithSpace = Array.from(copiedBoxes).find(box => {
                const boxImages = box.querySelectorAll('.copied-images img');
                return boxImages.length < 20;
            });

            if (existingBoxWithSpace) {
                targetContainer = existingBoxWithSpace.querySelector('.copied-images');
            } else {
                targetContainer = createNewCopiedBox();
            }

            animateImage(img, copiedImg, targetContainer);
        } else {
            isCopying = false;
        }
    }

    function animateImage(originalImg, copiedImg, targetContainer) {
        const originalRect = originalImg.getBoundingClientRect();
        const containerRect = targetContainer.getBoundingClientRect();
        
        const targetPosition = calculateTargetPosition(targetContainer);

        const clone = originalImg.cloneNode();
        document.body.appendChild(clone);
        clone.classList.add('animated-clone');
        clone.style.left = `${originalRect.left}px`;
        clone.style.top = `${originalRect.top}px`;        

        requestAnimationFrame(() => {
            const translateX = containerRect.left + targetPosition.x - originalRect.left;
            const translateY = containerRect.top + targetPosition.y - originalRect.top;
            clone.style.transform = `translate(${translateX}px, ${translateY}px)`;
        });

        clone.addEventListener('transitionend', () => {
            targetContainer.appendChild(copiedImg);
            document.body.removeChild(clone);
            isCopying = false;
        });
    }

    function calculateTargetPosition(container) {
        const images = container.querySelectorAll('img');
        const row = Math.floor(images.length / 5);
        const col = images.length % 5;
        const offset = 8; 
        return {
            x: col * (109 + offset),
            y: row * (170 + offset)
        };
    }

    function removeCopiedImage(src, originalImg) {
        if (copiedImagesMap[src]) {
            copiedBoxes = document.querySelectorAll('.copied-box');
            copiedBoxes.forEach((box, index) => {
                const boxImages = box.querySelector('.copied-images');
                const imgToRemove = Array.from(boxImages.querySelectorAll('img')).find(img => img.src === src);

                if (imgToRemove && imgToRemove.parentNode ) {
                    animateImageBack(imgToRemove, originalImg);
                    imgToRemove.parentNode.removeChild(imgToRemove);
                }
                if (boxImages.children.length < 20 && index < copiedBoxes.length - 1) {
                    let nextBoxImages = copiedBoxes[index + 1].querySelector('.copied-images').children;
                    showBox(copiedBoxes, currentCopiedBox);
                    while (boxImages.children.length < 20 && nextBoxImages.length > 0) {
                        boxImages.appendChild(nextBoxImages[0]);
                    }
                    if (nextBoxImages.length === 0 && copiedBoxes[index + 1].parentNode) {
                        copiedBoxes[index + 1].parentNode.removeChild(copiedBoxes[index + 1]);
                        copiedBoxes = document.querySelectorAll('.copied-box');
                    }
                }
                if (boxImages.children.length === 0 && box !== copiedBoxes[0]) {
                    if (box.parentNode) {
                        box.parentNode.removeChild(box);
                    }
                    copiedBoxes = document.querySelectorAll('.copied-box');
                    currentCopiedBox = Math.max(0, currentCopiedBox - 1);
                    
                    copiedBoxes.forEach((box, i) => {
                        box.querySelector('h3').textContent = `All The Curses You Selected (${i + 1})`;
                    });
                    showBox(copiedBoxes, copiedBoxes.length - 1);
                }
            });
            if (copiedBoxes.length > 0) {
                showBox(copiedBoxes, copiedBoxes.length - 1);
            }
            delete copiedImagesMap[src];
        }
    }

    function animateImageBack(copiedImg, originalImg) {
        const copiedRect = copiedImg.getBoundingClientRect();
        const originalRect = originalImg.getBoundingClientRect();

        const clone = copiedImg.cloneNode();
        document.body.appendChild(clone);
        clone.classList.add('animated-clone-back');
        clone.style.left = `${copiedRect.left}px`;
        clone.style.top = `${copiedRect.top}px`;

        requestAnimationFrame(() => {
            const translateX = originalRect.left - copiedRect.left;
            const translateY = originalRect.top - copiedRect.top;
            clone.style.transform = `translate(${translateX}px, ${translateY}px)`;
        });

        clone.addEventListener('transitionend', () => {
            document.body.removeChild(clone);
        });
    }

    function createNewCopiedBox() {
        currentCopiedBox++;
        const newCopiedBox = document.createElement('div');
        newCopiedBox.classList.add('copied-box');
        newCopiedBox.innerHTML = `<h3>All The Curses You Selected (${copiedBoxes.length + 1})</h3><div class="copied-images"></div>`;
        document.querySelector('.container').appendChild(newCopiedBox);
        copiedBoxes = document.querySelectorAll('.copied-box');
        showBox(copiedBoxes, currentCopiedBox);
        return newCopiedBox.querySelector('.copied-images');
    }
});
