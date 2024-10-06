---
layout: post
title: Azure - Tour d'horizon de la gouvernance Cloud
date: 2022-07-01
categories: [ "Azure" ]
comments_id: 172 
---


La gouvernance Cloud est un vaste sujet qui est aujourd'hui très à la mode. Dans cet article nous allons essayer de lever tout ce que se cache derrière ce terme, et comment y répondre pour une entreprise. Ici on ne va parler que d'Azure, mais il serait tout à fait possible de faire le parallèle avec tout autre Cloud qu'il soit public ou privé.

Commençons par la définition de Microsoft que l'on peut retrouver sur la [documentation Azure](https://docs.microsoft.com/en-us/azure/governance/azure-management) :

La gouvernance dans Azure est un aspect de la gestion Azure. Cet article décrit les différents domaines de gestion pour déployer et maintenir vos ressources dans Azure.

La gestion fait référence aux tâches et processus nécessaires pour maintenir vos applications métier et les ressources qui les prennent en charge. Azure a de nombreux services et outils qui fonctionnent ensemble pour offrir une gestion complète. Ces services ne sont pas uniquement destinés aux ressources dans Azure, mais également dans d’autres clouds et localement. La première étape pour concevoir un environnement de gestion complet est de bien comprendre les différents outils et comment ils fonctionnent ensemble.

Tout cela est bien résumé par un schéma :

![image]({{ site.url }}/images/2022/07/01/azure-tour-dhorizon-de-la-gouvernance-cloud-img0.png "image")

Mais en vrai qu'est ce que cela signifie réellement ? Nous allons essayer de le définir de manière la plus exhaustive qu'il soit. Et n'hésitez pas à ajouter des commentaires à cet article si vous avez d'autres idées.

Commençons par le début, et par se poser des questions sur "Sous quelles conditions mon entreprise souhaite-t-elle utiliser Azure ? Et sous quel contexte de sécurité ?" :

- Quel est le budget que je souhaite investir dans cette gouvernance ?
- Combien d'applications / utilisateurs dans Azure dans 5 ans ?
- Quels sont les risques que je veux couvrir lors de l'utilisation d'Azure ? Approche Zero trust ? Approche personnalisée plus souple ? Open bar ?
- Comment va-t-on fournir les assets Cloud à mes utilisateurs ? Autonomie des équipes ? Centralisation ? Approche mixte ?
- Comment ajouter de nouvelles applications / nouveaux utilisateurs ?
- Comment vais-je former mes équipes ? mes utilisateurs ?
- Comment vais-je monitorer Azure, mes applications, mes coûts ?
- Comment vais-je connecter Azure avec mon entreprise ?
- Vais-je faire une migration lift & shift, où transformer mes applications pour qu'elles soient Cloud Native ?

Si vous pouvez répondre à ces différentes questions, vous pourrez aborder votre stratégie d'utilisation d'Azure d'une manière plus sereine.

Mais attention il n'y a aucune mauvaise réponse à ces questions, car tout dépend de votre entreprise et des choix que vous faites.

Je vous propose de détailler des réponses possibles à certaines de ces questions dans de prochains articles, et nous verrons aussi comment implémenter cela sur Azure, notamment sur les sujets sécurités, et gouvernance.

Mais avant toute chose, enfonçons des portes ouvertes. Le fait d'avoir un planning de migration dans le Cloud et une stratégie de migration pour les applications existantes car il permet de plus facilement faire les bons choix, et d'avoir des indicateurs de succès.

En effet, si l'on prend l'exemple d'une grande entreprise qui fait le choix de migrer un large nombre d'applications sur le Cloud public versus une autre entreprise qui souhaite uniquement migrer un nombre restreint d'application, mais qui fait le choix d'utiliser le Cloud comme d'un backup pour ses données. On se retrouve ici sur deux scénarios totalement différent et qui sont plutôt viable pour des entreprises aujourd'hui.

Un des grands avantages du Cloud et d'avoir accès à un grand nombre de ressource très rapidement, et de pouvoir les supprimer à la fin de l'utilisation, donc il est possible de faire des choix de sécurité uniquement lié à la donnée, et de laisser la partie Compute avec une sécurité périmétrique moindre.

Pour des sites de ventes en ligne, si l'on migre toute la partie visible à savoir le site e-commerce directement dans le Cloud Public, on va prendre en compte en premier lieu la disponibilité et le bon fonctionnement du site. Mais on peut aussi faire le choix de migrer uniquement une autre partie du système d'information dans le Cloud qui est moins sensible à ce risque opérationnel, mais qui peut être dommageable en cas de fuite de données.

Bref au travers de ces quelques exemples nous pouvons voir que chaque entreprise est différente, et donc qu'il n'y a pas de stratégie toute tracées en fonction du type d'entreprise qui souhaite aller sur Azure. Mais nous verrons qu'il est possible de trouver des biais communs et après chacun est libre de faire son choix, voir même de ne pas utiliser le Cloud public, mais là vous vous priveriez d'une aventure extraordinaire.
